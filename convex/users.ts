import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
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

export const syncCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const now = Date.now();
    const tokenUser = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    const emailMatches = identity.email
      ? await ctx.db
          .query("users")
          .withIndex("email", (q) => q.eq("email", identity.email))
          .take(2)
      : [];
    const existingUser =
      tokenUser ??
      emailMatches.find((user) => user.tokenIdentifier === undefined) ??
      null;

    const name =
      identity.name ??
      identity.email ??
      identity.preferredUsername ??
      "Family member";

    if (existingUser) {
      const patch: Partial<Doc<"users">> = {};

      if (existingUser.email !== identity.email) {
        patch.email = identity.email;
      }

      if (existingUser.tokenIdentifier !== identity.tokenIdentifier) {
        patch.tokenIdentifier = identity.tokenIdentifier;
      }

      if (!existingUser.name) {
        patch.name = name;
      }

      if (!existingUser.image && identity.pictureUrl) {
        patch.image = identity.pictureUrl;
      }

      if (Object.keys(patch).length > 0) {
        patch.updatedAt = now;
        await ctx.db.patch(existingUser._id, patch);
      }

      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      name,
      email: identity.email,
      image: identity.pictureUrl,
      tokenIdentifier: identity.tokenIdentifier,
      createdAt: now,
      updatedAt: now,
    });
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
