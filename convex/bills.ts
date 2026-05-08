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
  normalizeHouseholdRole,
  requireCurrentUser,
  requireHouseholdMember,
  requireHouseholdRole,
} from "./lib/permissions";
import {
  billPriorityValidator,
  billStatusValidator,
  recurrenceFrequencyValidator,
} from "./lib/validators";

type BillStatus = Doc<"bills">["status"];

function cleanTitle(title: string) {
  const trimmed = title.trim();

  if (trimmed.length < 1) {
    throw new Error("Bill title is required.");
  }

  if (trimmed.length > 140) {
    throw new Error("Bill title must be 140 characters or fewer.");
  }

  return trimmed;
}

function cleanDescription(description?: string) {
  const trimmed = description?.trim();
  return trimmed ? trimmed : undefined;
}

async function requireBillInHousehold(
  ctx: QueryCtx | MutationCtx,
  householdId: Id<"households">,
  billId: Id<"bills">,
) {
  await requireHouseholdMember(ctx, householdId);
  const bill = await ctx.db.get(billId);

  if (!bill || bill.householdId !== householdId) {
    throw new Error("Bill not found.");
  }

  return bill;
}

async function ensureAssigneeIsMember(
  ctx: QueryCtx | MutationCtx,
  householdId: Id<"households">,
  ownerUserId?: Id<"users">,
) {
  if (!ownerUserId) {
    return;
  }

  await requireHouseholdMember(ctx, householdId, ownerUserId);
}

async function canRemoveBill(
  ctx: MutationCtx,
  householdId: Id<"households">,
  bill: Doc<"bills">,
  currentUserId: Id<"users">,
) {
  const membership = await requireHouseholdMember(ctx, householdId, currentUserId);
  const role = normalizeHouseholdRole(membership.role);

  if (role === "admin" || role === "adult" || bill.createdByUserId === currentUserId) {
    return;
  }

  throw new Error("You do not have permission to remove this bill.");
}

async function setBillStatus(
  ctx: MutationCtx,
  input: {
    householdId: Id<"households">;
    billId: Id<"bills">;
    status: BillStatus;
  },
) {
  const user = await requireCurrentUser(ctx);
  await requireHouseholdRole(ctx, input.householdId, ADULT_ROLES);
  const bill = await requireBillInHousehold(ctx, input.householdId, input.billId);
  const now = Date.now();
  const paidAt =
    input.status === "paid"
      ? bill.paidAt ?? now
      : bill.status === "paid"
        ? undefined
        : bill.paidAt;

  await ctx.db.patch(input.billId, {
    status: input.status,
    paidAt,
    updatedAt: now,
  });

  await writeActivityEvent(ctx, {
    householdId: input.householdId,
    actorUserId: user._id,
    action:
      input.status === "paid"
        ? ACTIVITY_ACTIONS.billPaid
        : ACTIVITY_ACTIONS.billStatusChanged,
    entityType: ENTITY_TYPES.bill,
    entityId: input.billId,
    message:
      input.status === "paid"
        ? `Paid bill "${bill.title}".`
        : `Changed bill status to ${input.status.replaceAll("_", " ")}.`,
  });

  return input.billId;
}

export const list = query({
  args: {
    householdId: v.id("households"),
    view: v.optional(
      v.union(
        v.literal("upcoming"),
        v.literal("overdue"),
        v.literal("paid"),
        v.literal("all"),
        v.literal("mine"),
        v.literal("subscriptions"),
      ),
    ),
    status: v.optional(billStatusValidator),
    ownerUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdMember(ctx, args.householdId, user._id);

    const now = Date.now();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    let bills = await ctx.db
      .query("bills")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .collect();

    if (args.status) {
      bills = bills.filter((bill) => bill.status === args.status);
    }

    if (args.ownerUserId) {
      bills = bills.filter((bill) => bill.ownerUserId === args.ownerUserId);
    }

    if (args.view === "upcoming") {
      bills = bills.filter(
        (bill) =>
          bill.dueAt !== undefined &&
          bill.dueAt >= start.getTime() &&
          !["paid", "cancelled"].includes(bill.status),
      );
    }

    if (args.view === "overdue") {
      bills = bills.filter(
        (bill) =>
          bill.dueAt !== undefined &&
          bill.dueAt < now &&
          !["paid", "cancelled"].includes(bill.status),
      );
    }

    if (args.view === "paid") {
      bills = bills.filter((bill) => bill.status === "paid");
    }

    if (args.view === "mine") {
      bills = bills.filter((bill) => bill.ownerUserId === user._id);
    }

    if (args.view === "subscriptions") {
      bills = bills.filter(
        (bill) =>
          bill.status !== "cancelled" &&
          (bill.autopay || bill.recurrenceRuleId !== undefined),
      );
    }

    return bills.sort((left, right) => {
      const leftDue = left.dueAt ?? Number.MAX_SAFE_INTEGER;
      const rightDue = right.dueAt ?? Number.MAX_SAFE_INTEGER;

      if (leftDue !== rightDue) {
        return leftDue - rightDue;
      }

      return right.updatedAt - left.updatedAt;
    });
  },
});

export const get = query({
  args: {
    householdId: v.id("households"),
    billId: v.id("bills"),
  },
  handler: async (ctx, args) => {
    return await requireBillInHousehold(ctx, args.householdId, args.billId);
  },
});

export const getDetails = query({
  args: {
    householdId: v.id("households"),
    billId: v.id("bills"),
  },
  handler: async (ctx, args) => {
    const bill = await requireBillInHousehold(ctx, args.householdId, args.billId);
    const recurrence = bill.recurrenceRuleId
      ? await ctx.db.get(bill.recurrenceRuleId)
      : null;

    return {
      bill,
      recurrence:
        recurrence &&
        recurrence.householdId === args.householdId &&
        recurrence.entityType === "bill"
          ? recurrence
          : null,
    };
  },
});

export const create = mutation({
  args: {
    householdId: v.id("households"),
    title: v.string(),
    description: v.optional(v.string()),
    provider: v.optional(v.string()),
    amountExpected: v.optional(v.number()),
    currency: v.optional(v.string()),
    dueAt: v.optional(v.number()),
    status: v.optional(billStatusValidator),
    priority: v.optional(billPriorityValidator),
    ownerUserId: v.optional(v.id("users")),
    autopay: v.optional(v.boolean()),
    recurrence: v.optional(
      v.object({
        frequency: recurrenceFrequencyValidator,
        interval: v.number(),
        startsAt: v.number(),
        endsAt: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, ADULT_ROLES);
    await ensureAssigneeIsMember(ctx, args.householdId, args.ownerUserId);

    const now = Date.now();
    let recurrenceRuleId: Id<"recurrenceRules"> | undefined;

    if (args.recurrence) {
      recurrenceRuleId = await ctx.db.insert("recurrenceRules", {
        householdId: args.householdId,
        entityType: "bill",
        frequency: args.recurrence.frequency,
        interval: Math.max(1, Math.floor(args.recurrence.interval)),
        startsAt: args.recurrence.startsAt,
        endsAt: args.recurrence.endsAt,
        generateAheadDays: 30,
        createdAt: now,
        updatedAt: now,
      });
    }

    const billId = await ctx.db.insert("bills", {
      householdId: args.householdId,
      title: cleanTitle(args.title),
      description: cleanDescription(args.description),
      provider: args.provider?.trim() ?? undefined,
      amountExpected: args.amountExpected,
      currency: args.currency ?? "EUR",
      dueAt: args.dueAt,
      status: args.status ?? "upcoming",
      priority: args.priority ?? "medium",
      ownerUserId: args.ownerUserId,
      autopay: args.autopay ?? false,
      recurrenceRuleId,
      createdByUserId: user._id,
      paidAt: undefined,
      createdAt: now,
      updatedAt: now,
    });

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.billCreated,
      entityType: ENTITY_TYPES.bill,
      entityId: billId,
      message: `Created bill "${args.title.trim()}".`,
    });

    return billId;
  },
});

export const update = mutation({
  args: {
    householdId: v.id("households"),
    billId: v.id("bills"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    provider: v.optional(v.string()),
    amountExpected: v.optional(v.number()),
    currency: v.optional(v.string()),
    dueAt: v.optional(v.union(v.number(), v.null())),
    priority: v.optional(billPriorityValidator),
    ownerUserId: v.optional(v.union(v.id("users"), v.null())),
    autopay: v.optional(v.boolean()),
    recurrence: v.optional(
      v.union(
        v.null(),
        v.object({
          frequency: recurrenceFrequencyValidator,
          interval: v.number(),
          startsAt: v.number(),
          endsAt: v.optional(v.number()),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, ADULT_ROLES);
    const bill = await requireBillInHousehold(ctx, args.householdId, args.billId);

    if (args.ownerUserId) {
      await ensureAssigneeIsMember(ctx, args.householdId, args.ownerUserId);
    }

    const patch: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) patch.title = cleanTitle(args.title);
    if (args.description !== undefined) patch.description = cleanDescription(args.description);
    if (args.provider !== undefined) patch.provider = args.provider?.trim() ?? undefined;
    if (args.amountExpected !== undefined) patch.amountExpected = args.amountExpected;
    if (args.currency !== undefined) patch.currency = args.currency;
    if (args.dueAt !== undefined) patch.dueAt = args.dueAt ?? undefined;
    if (args.priority !== undefined) patch.priority = args.priority;
    if (args.ownerUserId !== undefined) patch.ownerUserId = args.ownerUserId ?? undefined;
    if (args.autopay !== undefined) patch.autopay = args.autopay;

    if (args.recurrence !== undefined) {
      if (args.recurrence === null) {
        if (bill.recurrenceRuleId) {
          const existingRule = await ctx.db.get(bill.recurrenceRuleId);
          if (existingRule) {
            await ctx.db.delete(bill.recurrenceRuleId);
          }
        }
        patch.recurrenceRuleId = undefined;
      } else {
        const existingRule = bill.recurrenceRuleId
          ? await ctx.db.get(bill.recurrenceRuleId)
          : null;

        if (
          existingRule &&
          existingRule.householdId === args.householdId &&
          existingRule.entityType === "bill"
        ) {
          await ctx.db.patch(existingRule._id, {
            frequency: args.recurrence.frequency,
            interval: Math.max(1, Math.floor(args.recurrence.interval)),
            startsAt: args.recurrence.startsAt,
            endsAt: args.recurrence.endsAt,
            updatedAt: Date.now(),
          });
        } else {
          patch.recurrenceRuleId = await ctx.db.insert("recurrenceRules", {
            householdId: args.householdId,
            entityType: "bill",
            frequency: args.recurrence.frequency,
            interval: Math.max(1, Math.floor(args.recurrence.interval)),
            startsAt: args.recurrence.startsAt,
            endsAt: args.recurrence.endsAt,
            generateAheadDays: 30,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }
    }

    await ctx.db.patch(args.billId, patch);

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.billUpdated,
      entityType: ENTITY_TYPES.bill,
      entityId: args.billId,
      message: "Updated bill details.",
    });

    return args.billId;
  },
});

export const updateStatus = mutation({
  args: {
    householdId: v.id("households"),
    billId: v.id("bills"),
    status: billStatusValidator,
  },
  handler: async (ctx, args) => {
    return await setBillStatus(ctx, args);
  },
});

export const markPaid = mutation({
  args: {
    householdId: v.id("households"),
    billId: v.id("bills"),
  },
  handler: async (ctx, args) => {
    return await setBillStatus(ctx, { ...args, status: "paid" });
  },
});

export const cancel = mutation({
  args: {
    householdId: v.id("households"),
    billId: v.id("bills"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const bill = await requireBillInHousehold(ctx, args.householdId, args.billId);
    await canRemoveBill(ctx, args.householdId, bill, user._id);

    await ctx.db.patch(args.billId, {
      status: "cancelled",
      paidAt: undefined,
      updatedAt: Date.now(),
    });

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.billCancelled,
      entityType: ENTITY_TYPES.bill,
      entityId: args.billId,
      message: `Cancelled bill "${bill.title}".`,
    });

    return args.billId;
  },
});

export const remove = mutation({
  args: {
    householdId: v.id("households"),
    billId: v.id("bills"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const bill = await requireBillInHousehold(ctx, args.householdId, args.billId);
    await canRemoveBill(ctx, args.householdId, bill, user._id);

    await ctx.db.delete(args.billId);

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.billDeleted,
      entityType: ENTITY_TYPES.bill,
      entityId: args.billId,
      message: `Deleted bill "${bill.title}".`,
    });

    return args.billId;
  },
});

export const dashboard = query({
  args: {
    householdId: v.id("households"),
  },
  handler: async (ctx, args) => {
    await requireHouseholdMember(ctx, args.householdId);
    const now = Date.now();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const bills = await ctx.db
      .query("bills")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .collect();

    const active = bills.filter(
      (bill) => !["paid", "cancelled"].includes(bill.status),
    );

    const upcomingBills = active
      .filter((bill) => bill.dueAt !== undefined && bill.dueAt >= now)
      .sort((left, right) => (left.dueAt ?? 0) - (right.dueAt ?? 0))
      .slice(0, 5);

    const overdueBills = active
      .filter((bill) => bill.dueAt !== undefined && bill.dueAt < now)
      .sort((left, right) => (left.dueAt ?? 0) - (right.dueAt ?? 0))
      .slice(0, 5);

    return {
      upcomingBills,
      overdueBills,
      todayBills: active
        .filter(
          (bill) =>
            bill.dueAt !== undefined &&
            bill.dueAt >= start.getTime() &&
            bill.dueAt <= end.getTime(),
        )
        .sort((left, right) => (left.dueAt ?? 0) - (right.dueAt ?? 0))
        .slice(0, 5),
      totalUpcoming: active.filter(
        (bill) => bill.dueAt !== undefined && bill.dueAt >= now,
      ).length,
      totalOverdue: active.filter(
        (bill) => bill.dueAt !== undefined && bill.dueAt < now,
      ).length,
      totalToday: active.filter(
        (bill) =>
          bill.dueAt !== undefined &&
          bill.dueAt >= start.getTime() &&
          bill.dueAt <= end.getTime(),
      ).length,
    };
  },
});
