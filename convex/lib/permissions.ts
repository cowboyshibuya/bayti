import type { UserIdentity } from "convex/server";
import { getAuthUserId } from "@convex-dev/auth/server";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { HouseholdRole } from "./constants";

export function normalizeHouseholdRole(role: string): HouseholdRole {
  if (role === "owner") {
    return "admin";
  }

  if (role === "member") {
    return "adult";
  }

  return role as HouseholdRole;
}

export async function requireIdentity(
  ctx: QueryCtx | MutationCtx,
): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Authentication required.");
  }

  return identity;
}

function cleanEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function hasUsableDisplayName(name: string | undefined) {
  const length = name?.trim().length ?? 0;
  return length >= 2 && length <= 80;
}

async function findPasswordAccountEmail(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
) {
  const account = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) =>
      q.eq("userId", userId).eq("provider", "password"),
    )
    .first();

  return account ? cleanEmail(account.providerAccountId) : undefined;
}

async function hasHouseholdMembership(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
) {
  const membership = await ctx.db
    .query("householdMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  return membership !== null;
}

async function findCanonicalUserByEmail(
  ctx: QueryCtx | MutationCtx,
  email: string | undefined,
  currentUser: Doc<"users">,
) {
  if (!email || !email.includes("@")) {
    return currentUser;
  }

  const users = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .take(20);

  let fallback: Doc<"users"> | null = null;

  for (const user of users) {
    const hasMembership = await hasHouseholdMembership(ctx, user._id);

    if (hasMembership) {
      return user;
    }

    if (
      user.profileSetupCompletedAt !== undefined ||
      hasUsableDisplayName(user.name)
    ) {
      fallback ??= user;
    }

    if (user._id === currentUser._id) {
      fallback ??= user;
    }
  }

  return fallback ?? currentUser;
}

export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const identity = await requireIdentity(ctx);
  const authUserId = (await getAuthUserId(ctx)) as Id<"users"> | null;

  if (authUserId) {
    const authUser = await ctx.db.get(authUserId);

    if (authUser) {
      const email =
        cleanEmail(authUser.email) ||
        cleanEmail(identity.email) ||
        (await findPasswordAccountEmail(ctx, authUser._id));

      return await findCanonicalUserByEmail(ctx, email, authUser);
    }
  }

  const tokenUser = await ctx.db
    .query("users")
    .withIndex("by_token_identifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();

  if (tokenUser) {
    return tokenUser;
  }

  if (!identity.email) {
    return null;
  }

  const emailMatches = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", identity.email))
    .take(2);

  return emailMatches.length === 1 ? emailMatches[0] : null;
}

export async function requireCurrentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);

  if (!user) {
    throw new Error("Synced user record required.");
  }

  return user;
}

export async function requireHouseholdMember(
  ctx: QueryCtx | MutationCtx,
  householdId: Id<"households">,
  userId?: Id<"users">,
): Promise<Doc<"householdMembers">> {
  const currentUserId = userId ?? (await requireCurrentUser(ctx))._id;
  const membership = await ctx.db
    .query("householdMembers")
    .withIndex("by_household_user", (q) =>
      q.eq("householdId", householdId).eq("userId", currentUserId),
    )
    .unique();

  if (!membership) {
    throw new Error("Household membership required.");
  }

  return membership;
}

export async function requireHouseholdRole(
  ctx: QueryCtx | MutationCtx,
  householdId: Id<"households">,
  roles: readonly HouseholdRole[],
): Promise<Doc<"householdMembers">> {
  const membership = await requireHouseholdMember(ctx, householdId);

  if (!roles.includes(normalizeHouseholdRole(membership.role))) {
    throw new Error("You do not have permission for this household action.");
  }

  return membership;
}
