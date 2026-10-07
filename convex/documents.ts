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
import {
  deleteLinkedReminders,
  deleteTaggingsForEntity,
} from "./lib/deleteCleanup";
import { documentTypeValidator } from "./lib/validators";
import { enrichUser } from "./lib/users";

type DocumentPatch = Partial<Doc<"documents">>;

function cleanTitle(title: string) {
  const trimmed = title.trim();

  if (trimmed.length < 1) {
    throw new Error("Document title is required.");
  }

  if (trimmed.length > 140) {
    throw new Error("Document title must be 140 characters or fewer.");
  }

  return trimmed;
}

function cleanOptionalString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

async function requireDocumentInHousehold(
  ctx: QueryCtx | MutationCtx,
  householdId: Id<"households">,
  documentId: Id<"documents">,
) {
  await requireHouseholdMember(ctx, householdId);
  const document = await ctx.db.get(documentId);

  if (!document || document.householdId !== householdId) {
    throw new Error("Document not found.");
  }

  return document;
}

async function ensureFolderInHousehold(
  ctx: QueryCtx | MutationCtx,
  householdId: Id<"households">,
  folderId?: Id<"documentFolders"> | null,
) {
  if (!folderId) {
    return;
  }

  const folder = await ctx.db.get(folderId);

  if (!folder || folder.householdId !== householdId) {
    throw new Error("Document folder not found.");
  }
}

async function enrichDocument(ctx: QueryCtx, document: Doc<"documents">) {
  const [folder, uploadedBy, fileUrl] = await Promise.all([
    document.folderId ? ctx.db.get(document.folderId) : null,
    ctx.db.get(document.uploadedByUserId).then((user) => enrichUser(ctx, user)),
    document.storageId ? ctx.storage.getUrl(document.storageId) : null,
  ]);

  return {
    document,
    folder:
      folder && folder.householdId === document.householdId ? folder : null,
    uploadedBy,
    fileUrl,
  };
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const list = query({
  args: {
    householdId: v.id("households"),
    folderId: v.optional(v.union(v.id("documentFolders"), v.null())),
    documentType: v.optional(v.union(documentTypeValidator, v.literal("all"))),
    query: v.optional(v.string()),
    expiringOnly: v.optional(v.boolean()),
    issuedFrom: v.optional(v.number()),
    issuedTo: v.optional(v.number()),
    limit: v.optional(v.number()),
    sort: v.optional(
      v.union(
        v.literal("issued"),
        v.literal("issued-asc"),
        v.literal("latest"),
        v.literal("name"),
        v.literal("expires"),
        v.literal("size"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await requireHouseholdMember(ctx, args.householdId);

    const takeLimit = Math.min(args.limit ?? 200, 300);

    let documents: Doc<"documents">[] = [];
    // Filter and sort the household records before selecting a bounded result.
    for await (const document of ctx.db
      .query("documents")
      .withIndex("by_household", (q) =>
        q.eq("householdId", args.householdId),
      )) {
      if (
        args.folderId !== undefined &&
        document.folderId !== (args.folderId ?? undefined)
      )
        continue;
      if (
        args.documentType &&
        args.documentType !== "all" &&
        document.documentType !== args.documentType
      )
        continue;
      if (
        args.issuedFrom !== undefined &&
        (document.issuedAt === undefined || document.issuedAt < args.issuedFrom)
      )
        continue;
      if (
        args.issuedTo !== undefined &&
        (document.issuedAt === undefined || document.issuedAt > args.issuedTo)
      )
        continue;
      documents.push(document);
    }

    if (args.expiringOnly) {
      const now = Date.now();
      const windowEnd = now + 1000 * 60 * 60 * 24 * 45;
      documents = documents.filter(
        (document) =>
          document.expiresAt !== undefined && document.expiresAt <= windowEnd,
      );
    }

    if (args.query?.trim()) {
      const normalized = args.query.trim().toLowerCase();
      documents = documents.filter((document) =>
        [
          document.title,
          document.fileName,
          document.vendor,
          document.documentType,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalized)),
      );
    }

    const sort = args.sort ?? "issued";
    documents.sort((a, b) => {
      let diff = 0;
      if (sort === "name") diff = a.title.localeCompare(b.title);
      else if (sort === "size") diff = (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0);
      else if (sort === "latest") diff = b.updatedAt - a.updatedAt;
      else {
        const left = sort === "expires" ? a.expiresAt : a.issuedAt;
        const right = sort === "expires" ? b.expiresAt : b.issuedAt;
        if (left === undefined || right === undefined)
          diff = left === right ? 0 : left === undefined ? 1 : -1;
        else
          diff =
            sort === "expires" || sort === "issued-asc"
              ? left - right
              : right - left;
      }
      return diff || a._id.localeCompare(b._id);
    });
    return await Promise.all(
      documents
        .slice(0, takeLimit)
        .map((document) => enrichDocument(ctx, document)),
    );
  },
});

export const create = mutation({
  args: {
    householdId: v.id("households"),
    title: v.string(),
    documentType: documentTypeValidator,
    folderId: v.optional(v.union(v.id("documentFolders"), v.null())),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
    vendor: v.optional(v.string()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    issuedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);
    await ensureFolderInHousehold(ctx, args.householdId, args.folderId);

    const now = Date.now();
    const documentId = await ctx.db.insert("documents", {
      householdId: args.householdId,
      folderId: args.folderId ?? undefined,
      title: cleanTitle(args.title),
      documentType: args.documentType,
      storageId: args.storageId,
      fileName: cleanOptionalString(args.fileName),
      mimeType: cleanOptionalString(args.mimeType),
      sizeBytes: args.sizeBytes,
      vendor: cleanOptionalString(args.vendor),
      amount: args.amount,
      currency:
        cleanOptionalString(args.currency) ??
        (await ctx.db.get(args.householdId))?.currency ??
        "EUR",
      issuedAt: args.issuedAt,
      expiresAt: args.expiresAt,
      uploadedByUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.documentCreated,
      entityType: ENTITY_TYPES.document,
      entityId: documentId,
      message: `Added document "${args.title.trim()}".`,
    });

    return documentId;
  },
});

export const update = mutation({
  args: {
    householdId: v.id("households"),
    documentId: v.id("documents"),
    title: v.optional(v.string()),
    documentType: v.optional(documentTypeValidator),
    folderId: v.optional(v.union(v.id("documentFolders"), v.null())),
    vendor: v.optional(v.union(v.string(), v.null())),
    amount: v.optional(v.union(v.number(), v.null())),
    currency: v.optional(v.union(v.string(), v.null())),
    issuedAt: v.optional(v.union(v.number(), v.null())),
    expiresAt: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);
    await requireDocumentInHousehold(ctx, args.householdId, args.documentId);
    await ensureFolderInHousehold(ctx, args.householdId, args.folderId);

    const patch: DocumentPatch = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) patch.title = cleanTitle(args.title);
    if (args.documentType !== undefined) patch.documentType = args.documentType;
    if (args.folderId !== undefined)
      patch.folderId = args.folderId ?? undefined;
    if (args.vendor !== undefined)
      patch.vendor = cleanOptionalString(args.vendor);
    if (args.amount !== undefined) patch.amount = args.amount ?? undefined;
    if (args.currency !== undefined) {
      patch.currency = cleanOptionalString(args.currency) ?? undefined;
    }
    if (args.issuedAt !== undefined)
      patch.issuedAt = args.issuedAt ?? undefined;
    if (args.expiresAt !== undefined)
      patch.expiresAt = args.expiresAt ?? undefined;

    await ctx.db.patch(args.documentId, patch);

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.documentUpdated,
      entityType: ENTITY_TYPES.document,
      entityId: args.documentId,
      message: "Updated a document.",
    });

    return args.documentId;
  },
});

export const remove = mutation({
  args: {
    householdId: v.id("households"),
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);
    const document = await requireDocumentInHousehold(
      ctx,
      args.householdId,
      args.documentId,
    );

    const links = await ctx.db
      .query("documentLinks")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .take(100);

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    await deleteLinkedReminders(
      ctx,
      args.householdId,
      "document",
      args.documentId,
    );
    await deleteTaggingsForEntity(
      ctx,
      args.householdId,
      ENTITY_TYPES.document,
      args.documentId,
    );

    if (document.storageId) {
      await ctx.storage.delete(document.storageId);
    }

    await ctx.db.delete(args.documentId);

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.documentDeleted,
      entityType: ENTITY_TYPES.document,
      entityId: args.documentId,
      message: `Deleted document "${document.title}".`,
    });

    return args.documentId;
  },
});

export const getFileUrl = query({
  args: {
    householdId: v.id("households"),
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const document = await requireDocumentInHousehold(
      ctx,
      args.householdId,
      args.documentId,
    );

    if (!document.storageId) {
      return null;
    }

    return await ctx.storage.getUrl(document.storageId);
  },
});
