import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { ACTIVITY_ACTIONS, ENTITY_TYPES, WRITE_ROLES } from "./lib/constants";
import { writeActivityEvent } from "./lib/activity";
import {
  requireCurrentUser,
  requireHouseholdMember,
  requireHouseholdRole,
} from "./lib/permissions";

function cleanName(name: string) {
  const trimmed = name.trim();

  if (trimmed.length < 1) {
    throw new Error("Folder name is required.");
  }

  if (trimmed.length > 80) {
    throw new Error("Folder name must be 80 characters or fewer.");
  }

  return trimmed;
}

function cleanDescription(description?: string) {
  const trimmed = description?.trim();
  return trimmed ? trimmed : undefined;
}

async function requireFolderInHousehold(
  ctx: QueryCtx | MutationCtx,
  householdId: Id<"households">,
  folderId: Id<"documentFolders">,
) {
  await requireHouseholdMember(ctx, householdId);
  const folder = await ctx.db.get(folderId);

  if (!folder || folder.householdId !== householdId) {
    throw new Error("Document folder not found.");
  }

  return folder;
}

async function folderStats(
  ctx: QueryCtx,
  householdId: Id<"households">,
  folder: Doc<"documentFolders"> | null,
) {
  const documents = await ctx.db
    .query("documents")
    .withIndex("by_household_folder", (q) =>
      q.eq("householdId", householdId).eq("folderId", folder?._id),
    )
    .take(200);

  return {
    folder,
    count: documents.length,
    sizeBytes: documents.reduce(
      (total, document) => total + (document.sizeBytes ?? 0),
      0,
    ),
  };
}

export const list = query({
  args: {
    householdId: v.id("households"),
  },
  handler: async (ctx, args) => {
    await requireHouseholdMember(ctx, args.householdId);

    const folders = await ctx.db
      .query("documentFolders")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .take(100);

    const withStats = await Promise.all(
      folders
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((folder) => folderStats(ctx, args.householdId, folder)),
    );
    const unfiled = await folderStats(ctx, args.householdId, null);

    return {
      folders: withStats,
      unfiled,
    };
  },
});

export const create = mutation({
  args: {
    householdId: v.id("households"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);

    const now = Date.now();
    const folderId = await ctx.db.insert("documentFolders", {
      householdId: args.householdId,
      name: cleanName(args.name),
      description: cleanDescription(args.description),
      createdByUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.documentFolderCreated,
      entityType: ENTITY_TYPES.document,
      entityId: folderId,
      message: `Created document folder "${args.name.trim()}".`,
    });

    return folderId;
  },
});

export const update = mutation({
  args: {
    householdId: v.id("households"),
    folderId: v.id("documentFolders"),
    name: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);
    await requireFolderInHousehold(ctx, args.householdId, args.folderId);

    const patch: Partial<Doc<"documentFolders">> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      patch.name = cleanName(args.name);
    }
    if (args.description !== undefined) {
      patch.description = args.description ? cleanDescription(args.description) : undefined;
    }

    await ctx.db.patch(args.folderId, patch);

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.documentFolderUpdated,
      entityType: ENTITY_TYPES.document,
      entityId: args.folderId,
      message: "Updated a document folder.",
    });

    return args.folderId;
  },
});

export const remove = mutation({
  args: {
    householdId: v.id("households"),
    folderId: v.id("documentFolders"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);
    const folder = await requireFolderInHousehold(
      ctx,
      args.householdId,
      args.folderId,
    );

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_household_folder", (q) =>
        q.eq("householdId", args.householdId).eq("folderId", args.folderId),
      )
      .take(1);

    if (documents.length > 0) {
      throw new Error("Move documents to Unfiled before deleting this folder.");
    }

    await ctx.db.delete(args.folderId);

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.documentFolderDeleted,
      entityType: ENTITY_TYPES.document,
      entityId: args.folderId,
      message: `Deleted document folder "${folder.name}".`,
    });

    return args.folderId;
  },
});
