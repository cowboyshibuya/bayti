import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Doc, Id } from "./_generated/dataModel";

function cleanEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function cleanSignupName(value: unknown, email: string) {
  const name = String(value ?? "").trim();

  if (name.length === 0) {
    return email;
  }

  if (name.length < 2) {
    throw new Error("Display name must be at least 2 characters.");
  }

  if (name.length > 80) {
    throw new Error("Display name must be 80 characters or fewer.");
  }

  return name;
}

function hasUsableDisplayName(name: string | undefined) {
  const length = name?.trim().length ?? 0;
  return length >= 2 && length <= 80;
}

async function hasHouseholdMembership(
  ctx: GenericMutationCtx<DataModel>,
  userId: Id<"users">,
) {
  const membership = await ctx.db
    .query("householdMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  return membership !== null;
}

async function findBestUserForEmail(
  ctx: GenericMutationCtx<DataModel>,
  email: string,
  existingUserId: Id<"users"> | null,
) {
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

    if (existingUserId && user._id === existingUserId) {
      fallback ??= user;
    }
  }

  if (fallback) {
    return fallback;
  }

  if (existingUserId) {
    return await ctx.db.get(existingUserId);
  }

  return null;
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params) {
        const now = Date.now();
        const email = cleanEmail(params.email);

        if (!email.includes("@")) {
          throw new Error("Enter a valid email.");
        }

        return {
          email,
          name: cleanSignupName(params.name, email),
          createdAt: now,
          updatedAt: now,
        };
      },
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      const now = Date.now();
      const email = cleanEmail(args.profile.email);
      const existingUserId = args.existingUserId as Id<"users"> | null;

      if (!email.includes("@")) {
        if (!existingUserId) {
          throw new Error("Enter a valid email.");
        }

        return existingUserId;
      }

      const user = await findBestUserForEmail(ctx, email, existingUserId);
      const name = cleanSignupName(args.profile.name, email);

      if (user) {
        const patch: Partial<Doc<"users">> = {};

        if (user.email !== email) {
          patch.email = email;
        }

        if (!user.name && name) {
          patch.name = name;
        }

        if (
          !user.profileSetupCompletedAt &&
          (await hasHouseholdMembership(ctx, user._id)) &&
          hasUsableDisplayName(patch.name ?? user.name)
        ) {
          patch.profileSetupCompletedAt = now;
        }

        if (Object.keys(patch).length > 0) {
          patch.updatedAt = now;
          await ctx.db.patch(user._id, patch);
        }

        return user._id;
      }

      return await ctx.db.insert("users", {
        email,
        name,
        createdAt: now,
        updatedAt: now,
      });
    },
  },
});
