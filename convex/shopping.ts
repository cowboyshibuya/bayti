import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  ACTIVITY_ACTIONS,
  ENTITY_TYPES,
  WRITE_ROLES,
} from "./lib/constants";
import { writeActivityEvent } from "./lib/activity";
import {
  requireCurrentUser,
  requireHouseholdMember,
  requireHouseholdRole,
} from "./lib/permissions";
import { shoppingListStatusValidator } from "./lib/validators";

function cleanName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 1) throw new Error("Name is required.");
  if (trimmed.length > 140) throw new Error("Name must be 140 characters or fewer.");
  return trimmed;
}

function cleanString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

async function requireListInHousehold(
  ctx: QueryCtx | MutationCtx,
  householdId: Id<"households">,
  listId: Id<"shoppingLists">,
) {
  await requireHouseholdMember(ctx, householdId);
  const list = await ctx.db.get(listId);
  if (!list || list.householdId !== householdId) {
    throw new Error("Shopping list not found.");
  }
  return list;
}

async function canRemoveList(
  ctx: MutationCtx,
  householdId: Id<"households">,
  list: Doc<"shoppingLists">,
  currentUserId: Id<"users">,
) {
  const membership = await requireHouseholdMember(ctx, householdId, currentUserId);
  if (membership.role === "admin" || membership.role === "adult" || list.createdByUserId === currentUserId) {
    return;
  }
  throw new Error("You do not have permission to remove this list.");
}

export const listLists = query({
  args: {
    householdId: v.id("households"),
    status: v.optional(shoppingListStatusValidator),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdMember(ctx, args.householdId, user._id);

    let lists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .collect();

    if (args.status) {
      lists = lists.filter((list) => list.status === args.status);
    }

    return lists.sort((left, right) => right.updatedAt - left.updatedAt);
  },
});

export const getList = query({
  args: {
    householdId: v.id("households"),
    listId: v.id("shoppingLists"),
  },
  handler: async (ctx, args) => {
    await requireHouseholdMember(ctx, args.householdId);
    const list = await ctx.db.get(args.listId);
    if (!list || list.householdId !== args.householdId) {
      throw new Error("Shopping list not found.");
    }

    const items = await ctx.db
      .query("shoppingItems")
      .withIndex("by_shopping_list", (q) => q.eq("shoppingListId", args.listId))
      .collect();

    return { list, items: items.sort((left, right) => left.createdAt - right.createdAt) };
  },
});

export const createList = mutation({
  args: {
    householdId: v.id("households"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);

    const now = Date.now();
    const listId = await ctx.db.insert("shoppingLists", {
      householdId: args.householdId,
      name: cleanName(args.name),
      status: "active",
      createdByUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.shoppingListCreated,
      entityType: ENTITY_TYPES.shoppingList,
      entityId: listId,
      message: `Created shopping list "${args.name.trim()}".`,
    });

    return listId;
  },
});

export const updateList = mutation({
  args: {
    householdId: v.id("households"),
    listId: v.id("shoppingLists"),
    name: v.optional(v.string()),
    status: v.optional(shoppingListStatusValidator),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);
    await requireListInHousehold(ctx, args.householdId, args.listId);

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = cleanName(args.name);
    if (args.status !== undefined) patch.status = args.status;

    await ctx.db.patch(args.listId, patch);

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.shoppingListUpdated,
      entityType: ENTITY_TYPES.shoppingList,
      entityId: args.listId,
      message: "Updated shopping list.",
    });

    return args.listId;
  },
});

export const deleteList = mutation({
  args: {
    householdId: v.id("households"),
    listId: v.id("shoppingLists"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const list = await requireListInHousehold(ctx, args.householdId, args.listId);
    await canRemoveList(ctx, args.householdId, list, user._id);

    const items = await ctx.db
      .query("shoppingItems")
      .withIndex("by_shopping_list", (q) => q.eq("shoppingListId", args.listId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    await ctx.db.delete(args.listId);

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.shoppingListDeleted,
      entityType: ENTITY_TYPES.shoppingList,
      entityId: args.listId,
      message: `Deleted shopping list "${list.name}".`,
    });

    return args.listId;
  },
});

export const addItem = mutation({
  args: {
    householdId: v.id("households"),
    listId: v.id("shoppingLists"),
    name: v.string(),
    quantity: v.optional(v.string()),
    category: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);
    await requireListInHousehold(ctx, args.householdId, args.listId);

    const now = Date.now();
    const itemId = await ctx.db.insert("shoppingItems", {
      shoppingListId: args.listId,
      name: cleanName(args.name),
      quantity: cleanString(args.quantity),
      category: cleanString(args.category),
      note: cleanString(args.note),
      checked: false,
      checkedByUserId: undefined,
      checkedAt: undefined,
      createdByUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.listId, { updatedAt: now });

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.shoppingItemAdded,
      entityType: ENTITY_TYPES.shoppingList,
      entityId: args.listId,
      message: `Added "${args.name.trim()}" to shopping list.`,
    });

    return itemId;
  },
});

export const updateItem = mutation({
  args: {
    householdId: v.id("households"),
    listId: v.id("shoppingLists"),
    itemId: v.id("shoppingItems"),
    name: v.optional(v.string()),
    quantity: v.optional(v.string()),
    category: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);
    await requireListInHousehold(ctx, args.householdId, args.listId);

    const item = await ctx.db.get(args.itemId);
    if (!item || item.shoppingListId !== args.listId) {
      throw new Error("Item not found.");
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = cleanName(args.name);
    if (args.quantity !== undefined) patch.quantity = cleanString(args.quantity);
    if (args.category !== undefined) patch.category = cleanString(args.category);
    if (args.note !== undefined) patch.note = cleanString(args.note);

    await ctx.db.patch(args.itemId, patch);
    await ctx.db.patch(args.listId, { updatedAt: Date.now() });

    return args.itemId;
  },
});

export const toggleItem = mutation({
  args: {
    householdId: v.id("households"),
    listId: v.id("shoppingLists"),
    itemId: v.id("shoppingItems"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdMember(ctx, args.householdId, user._id);
    await requireListInHousehold(ctx, args.householdId, args.listId);

    const item = await ctx.db.get(args.itemId);
    if (!item || item.shoppingListId !== args.listId) {
      throw new Error("Item not found.");
    }

    const now = Date.now();
    const checked = !item.checked;

    await ctx.db.patch(args.itemId, {
      checked,
      checkedByUserId: checked ? user._id : undefined,
      checkedAt: checked ? now : undefined,
      updatedAt: now,
    });

    await ctx.db.patch(args.listId, { updatedAt: now });

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.shoppingItemToggled,
      entityType: ENTITY_TYPES.shoppingList,
      entityId: args.listId,
      message: `${checked ? "Checked off" : "Unchecked"} "${item.name}".`,
    });

    return args.itemId;
  },
});

export const deleteItem = mutation({
  args: {
    householdId: v.id("households"),
    listId: v.id("shoppingLists"),
    itemId: v.id("shoppingItems"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);
    await requireListInHousehold(ctx, args.householdId, args.listId);

    const item = await ctx.db.get(args.itemId);
    if (!item || item.shoppingListId !== args.listId) {
      throw new Error("Item not found.");
    }

    await ctx.db.delete(args.itemId);
    await ctx.db.patch(args.listId, { updatedAt: Date.now() });

    return args.itemId;
  },
});

export const clearCompleted = mutation({
  args: {
    householdId: v.id("households"),
    listId: v.id("shoppingLists"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);
    await requireListInHousehold(ctx, args.householdId, args.listId);

    const items = await ctx.db
      .query("shoppingItems")
      .withIndex("by_shopping_list_checked", (q) =>
        q.eq("shoppingListId", args.listId).eq("checked", true),
      )
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    await ctx.db.patch(args.listId, { updatedAt: Date.now() });

    return items.length;
  },
});

export const dashboard = query({
  args: {
    householdId: v.id("households"),
  },
  handler: async (ctx, args) => {
    await requireHouseholdMember(ctx, args.householdId);

    const lists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_household_status", (q) =>
        q.eq("householdId", args.householdId).eq("status", "active"),
      )
      .collect();

    const listIds = lists.map((list) => list._id);
    const allItems = await ctx.db
      .query("shoppingItems")
      .withIndex("by_shopping_list", (q) =>
        q.eq("shoppingListId", listIds[0] as Id<"shoppingLists">),
      )
      .collect();

    const activeLists = lists.slice(0, 3);
    const listWithItems = [];

    for (const list of activeLists) {
      const items = await ctx.db
        .query("shoppingItems")
        .withIndex("by_shopping_list", (q) => q.eq("shoppingListId", list._id))
        .collect();
      listWithItems.push({ list, items });
    }

    return {
      activeLists: listWithItems,
      totalActiveLists: lists.length,
    };
  },
});
