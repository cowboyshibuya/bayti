import { v } from "convex/values";
import { getAuthSessionId, getAuthUserId } from "@convex-dev/auth/server";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  assertImageStorageFile,
  enrichUser,
} from "./lib/users";
import { requireCurrentUser, requireIdentity } from "./lib/permissions";

const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function cleanDisplayName(name: string) {
  const trimmed = name.trim();

  if (trimmed.length < 2) {
    throw new Error("Display name must be at least 2 characters.");
  }

  if (trimmed.length > 80) {
    throw new Error("Display name must be 80 characters or fewer.");
  }

  return trimmed;
}

function hasUsableDisplayName(name: string | undefined) {
  const length = name?.trim().length ?? 0;
  return length >= 2 && length <= 80;
}

function cleanEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

async function findPasswordAccountEmail(
  ctx: MutationCtx,
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
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  const membership = await ctx.db
    .query("householdMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  return membership !== null;
}

async function findCanonicalUserByEmail(
  ctx: MutationCtx,
  email: string | undefined,
  currentUserId: Id<"users">,
) {
  if (!email || !email.includes("@")) {
    return await ctx.db.get(currentUserId);
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

    if (user._id === currentUserId) {
      fallback ??= user;
    }
  }

  return fallback ?? (await ctx.db.get(currentUserId));
}

async function relinkCurrentAuthRecords(
  ctx: MutationCtx,
  fromUserId: Id<"users">,
  toUserId: Id<"users">,
) {
  if (fromUserId === toUserId) {
    return;
  }

  const sessionId = (await getAuthSessionId(ctx)) as Id<"authSessions"> | null;

  if (sessionId) {
    const session = await ctx.db.get(sessionId);

    if (session?.userId === fromUserId) {
      await ctx.db.patch(sessionId, { userId: toUserId });
    }
  }

  const accounts = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) =>
      q.eq("userId", fromUserId).eq("provider", "password"),
    )
    .take(10);

  for (const account of accounts) {
    await ctx.db.patch(account._id, { userId: toUserId });
  }
}

export const syncCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const now = Date.now();
    const authUserId = (await getAuthUserId(ctx)) as Id<"users"> | null;
    const name =
      identity.name ??
      identity.email ??
      identity.preferredUsername ??
      "Family member";

    if (!authUserId) {
      const tokenUser = await ctx.db
        .query("users")
        .withIndex("by_token_identifier", (q) =>
          q.eq("tokenIdentifier", identity.tokenIdentifier),
        )
        .unique();

      if (tokenUser) {
        return tokenUser._id;
      }

      throw new Error("Authenticated user record missing.");
    }

    const authUser = await ctx.db.get(authUserId);

    if (!authUser) {
      throw new Error("Authenticated user record missing.");
    }

    const email =
      cleanEmail(authUser.email) ||
      cleanEmail(identity.email) ||
      (await findPasswordAccountEmail(ctx, authUser._id));
    const canonicalUser = await findCanonicalUserByEmail(
      ctx,
      email,
      authUser._id,
    );

    if (!canonicalUser) {
      throw new Error("Authenticated user record missing.");
    }

    if (canonicalUser._id !== authUser._id) {
      const authUserHasMembership = await hasHouseholdMembership(
        ctx,
        authUser._id,
      );
      const canonicalHasMembership = await hasHouseholdMembership(
        ctx,
        canonicalUser._id,
      );

      if (!authUserHasMembership && canonicalHasMembership) {
        await relinkCurrentAuthRecords(ctx, authUser._id, canonicalUser._id);
      }
    }

    const patch: Partial<Doc<"users">> = {};

    if (email && canonicalUser.email !== email) {
      patch.email = email;
    }

    if (canonicalUser.tokenIdentifier !== identity.tokenIdentifier) {
      patch.tokenIdentifier = identity.tokenIdentifier;
    }

    if (!canonicalUser.name) {
      patch.name = name;
    }

    if (!canonicalUser.image && identity.pictureUrl) {
      patch.image = identity.pictureUrl;
    }

    if (
      !canonicalUser.profileSetupCompletedAt &&
      hasUsableDisplayName(patch.name ?? canonicalUser.name) &&
      (await hasHouseholdMembership(ctx, canonicalUser._id))
    ) {
      patch.profileSetupCompletedAt = now;
    }

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = now;
      await ctx.db.patch(canonicalUser._id, patch);
    }

    return canonicalUser._id;
  },
});

export const getCurrentProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const enrichedUser = await enrichUser(ctx, user);

    return {
      user: enrichedUser,
      profileImageUrl: enrichedUser?.profileImageUrl ?? null,
      hasCustomProfileImage: Boolean(user.profileImageStorageId),
    };
  },
});

export const generateProfileImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateProfile = mutation({
  args: {
    name: v.string(),
    profileImageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const name = cleanDisplayName(args.name);

    if (args.profileImageStorageId) {
      await assertImageStorageFile(
        ctx,
        args.profileImageStorageId,
        MAX_PROFILE_IMAGE_SIZE_BYTES,
      );
    }

    const previousProfileImageStorageId = user.profileImageStorageId;

    await ctx.db.patch(user._id, {
      name,
      profileImageStorageId:
        args.profileImageStorageId ?? previousProfileImageStorageId,
      profileSetupCompletedAt: user.profileSetupCompletedAt ?? Date.now(),
      updatedAt: Date.now(),
    });

    if (
      args.profileImageStorageId &&
      previousProfileImageStorageId &&
      previousProfileImageStorageId !== args.profileImageStorageId
    ) {
      await ctx.storage.delete(previousProfileImageStorageId);
    }

    return user._id;
  },
});

export const removeProfileImage = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const previousProfileImageStorageId = user.profileImageStorageId;

    await ctx.db.patch(user._id, {
      profileImageStorageId: undefined,
      updatedAt: Date.now(),
    });

    if (previousProfileImageStorageId) {
      await ctx.storage.delete(previousProfileImageStorageId);
    }

    return user._id;
  },
});
