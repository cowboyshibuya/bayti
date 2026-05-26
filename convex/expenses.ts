import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  ACTIVITY_ACTIONS,
  ADULT_ROLES,
  ENTITY_TYPES,
} from "./lib/constants";
import { writeActivityEvent } from "./lib/activity";
import {
  requireCurrentUser,
  requireHouseholdMember,
  requireHouseholdRole,
} from "./lib/permissions";
import {
  deleteDocumentLinksForEntity,
  deleteTaggingsForEntity,
} from "./lib/deleteCleanup";
import { expenseCategoryValidator } from "./lib/validators";

function cleanTitle(title: string) {
  const trimmed = title.trim();
  if (trimmed.length < 1) throw new Error("Expense title is required.");
  if (trimmed.length > 140) throw new Error("Expense title must be 140 characters or fewer.");
  return trimmed;
}

function cleanString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

async function requireExpenseInHousehold(
  ctx: QueryCtx | MutationCtx,
  householdId: Id<"households">,
  expenseId: Id<"expenses">,
) {
  await requireHouseholdMember(ctx, householdId);
  const expense = await ctx.db.get(expenseId);
  if (!expense || expense.householdId !== householdId) {
    throw new Error("Expense not found.");
  }
  return expense;
}

export const list = query({
  args: {
    householdId: v.id("households"),
    view: v.optional(
      v.union(
        v.literal("all"),
        v.literal("mine"),
        v.literal("this_month"),
        v.literal("last_month"),
      ),
    ),
    category: v.optional(expenseCategoryValidator),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdMember(ctx, args.householdId, user._id);

    let expenses = await ctx.db
      .query("expenses")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .collect();

    if (args.category) {
      expenses = expenses.filter((e) => e.category === args.category);
    }

    if (args.startDate !== undefined && args.endDate !== undefined) {
      const s = args.startDate;
      const e = args.endDate;
      expenses = expenses.filter(
        (exp) => exp.spentAt >= s && exp.spentAt <= e,
      );
    }

    if (args.view === "this_month") {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      expenses = expenses.filter((e) => e.spentAt >= start && e.spentAt <= end);
    }

    if (args.view === "last_month") {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();
      expenses = expenses.filter((e) => e.spentAt >= start && e.spentAt <= end);
    }

    if (args.view === "mine") {
      expenses = expenses.filter((e) => e.paidByUserId === user._id);
    }

    return expenses.sort((left, right) => right.spentAt - left.spentAt);
  },
});

export const get = query({
  args: {
    householdId: v.id("households"),
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, args) => {
    return await requireExpenseInHousehold(ctx, args.householdId, args.expenseId);
  },
});

export const create = mutation({
  args: {
    householdId: v.id("households"),
    title: v.string(),
    merchant: v.optional(v.string()),
    amount: v.number(),
    currency: v.optional(v.string()),
    spentAt: v.number(),
    category: expenseCategoryValidator,
    paymentMethod: v.optional(v.string()),
    notes: v.optional(v.string()),
    paidByUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, ADULT_ROLES);

    if (args.paidByUserId) {
      await requireHouseholdMember(ctx, args.householdId, args.paidByUserId);
    }

    const now = Date.now();
    const expenseId = await ctx.db.insert("expenses", {
      householdId: args.householdId,
      title: cleanTitle(args.title),
      merchant: cleanString(args.merchant),
      amount: Math.max(0, args.amount),
      currency: args.currency?.toUpperCase() ?? "EUR",
      spentAt: args.spentAt,
      category: args.category,
      paymentMethod: cleanString(args.paymentMethod),
      notes: cleanString(args.notes),
      paidByUserId: args.paidByUserId,
      createdByUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.expenseCreated,
      entityType: ENTITY_TYPES.expense,
      entityId: expenseId,
      message: `Logged expense "${args.title.trim()}" (${args.amount.toFixed(2)} ${args.currency?.toUpperCase() ?? "EUR"}).`,
    });

    return expenseId;
  },
});

export const update = mutation({
  args: {
    householdId: v.id("households"),
    expenseId: v.id("expenses"),
    title: v.optional(v.string()),
    merchant: v.optional(v.string()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    spentAt: v.optional(v.number()),
    category: v.optional(expenseCategoryValidator),
    paymentMethod: v.optional(v.string()),
    notes: v.optional(v.string()),
    paidByUserId: v.optional(v.union(v.id("users"), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, ADULT_ROLES);
    await requireExpenseInHousehold(ctx, args.householdId, args.expenseId);

    if (args.paidByUserId) {
      await requireHouseholdMember(ctx, args.householdId, args.paidByUserId);
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.title !== undefined) patch.title = cleanTitle(args.title);
    if (args.merchant !== undefined) patch.merchant = cleanString(args.merchant);
    if (args.amount !== undefined) patch.amount = Math.max(0, args.amount);
    if (args.currency !== undefined) patch.currency = args.currency.toUpperCase();
    if (args.spentAt !== undefined) patch.spentAt = args.spentAt;
    if (args.category !== undefined) patch.category = args.category;
    if (args.paymentMethod !== undefined) patch.paymentMethod = cleanString(args.paymentMethod);
    if (args.notes !== undefined) patch.notes = cleanString(args.notes);
    if (args.paidByUserId !== undefined) patch.paidByUserId = args.paidByUserId ?? undefined;

    await ctx.db.patch(args.expenseId, patch);

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.expenseUpdated,
      entityType: ENTITY_TYPES.expense,
      entityId: args.expenseId,
      message: "Updated expense details.",
    });

    return args.expenseId;
  },
});

export const remove = mutation({
  args: {
    householdId: v.id("households"),
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const expense = await requireExpenseInHousehold(ctx, args.householdId, args.expenseId);
    await requireHouseholdRole(ctx, args.householdId, ADULT_ROLES);

    await deleteDocumentLinksForEntity(ctx, args.householdId, "expense", args.expenseId);
    await deleteTaggingsForEntity(ctx, args.householdId, ENTITY_TYPES.expense, args.expenseId);
    await ctx.db.delete(args.expenseId);

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.expenseDeleted,
      entityType: ENTITY_TYPES.expense,
      entityId: args.expenseId,
      message: `Deleted expense "${expense.title}".`,
    });

    return args.expenseId;
  },
});

export const dashboard = query({
  args: {
    householdId: v.id("households"),
  },
  handler: async (ctx, args) => {
    await requireHouseholdMember(ctx, args.householdId);

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .collect();

    const thisMonthExpenses = expenses.filter(
      (e) => e.spentAt >= thisMonthStart && e.spentAt <= thisMonthEnd,
    );
    const todayExpenses = expenses.filter(
      (e) => e.spentAt >= todayStart.getTime() && e.spentAt <= todayEnd.getTime(),
    );

    const totalThisMonth = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalToday = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      recentExpenses: expenses.sort((a, b) => b.spentAt - a.spentAt).slice(0, 5),
      totalThisMonth,
      countThisMonth: thisMonthExpenses.length,
      todayExpenses: todayExpenses.sort((a, b) => b.spentAt - a.spentAt).slice(0, 5),
      totalToday,
      countToday: todayExpenses.length,
    };
  },
});
