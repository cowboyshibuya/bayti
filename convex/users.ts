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
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) =>
        q.eq("email", identity.email),
      )
      .unique();

    const name =
      identity.name ??
      identity.email ??
      identity.preferredUsername ??
      "Family member";

    if (existing) {
      const patch: Partial<Doc<"users">> = {
        email: identity.email,
        updatedAt: now,
      };

      if (!existing.name) {
        patch.name = name;
      }

      if (!existing.image && identity.pictureUrl) {
        patch.image = identity.pictureUrl;
      }

      await ctx.db.patch(existing._id, patch);

      return existing._id;
    }

    return await ctx.db.insert("users", {
      name,
      email: identity.email,
      image: identity.pictureUrl,
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
