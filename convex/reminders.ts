import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { ACTIVITY_ACTIONS, ENTITY_TYPES, WRITE_ROLES } from "./lib/constants";
import { writeActivityEvent } from "./lib/activity";
import {
  requireCurrentUser,
  requireHouseholdMember,
  requireHouseholdRole,
} from "./lib/permissions";
import { reminderEntityTypeValidator } from "./lib/validators";

type ReminderEntityType = "task" | "bill" | "event" | "document" | "manual";

function cleanText(value: string, label: string, maxLength: number) {
  const trimmed = value.trim();

  if (trimmed.length < 1) {
    throw new Error(`${label} is required.`);
  }

  if (trimmed.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }

  return trimmed;
}

function cleanOptionalText(value?: string, maxLength = 500) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length > maxLength) {
    throw new Error(`Text must be ${maxLength} characters or fewer.`);
  }

  return trimmed;
}

async function requireReminderInHousehold(
  ctx: MutationCtx | QueryCtx,
  householdId: Id<"households">,
  reminderId: Id<"reminders">,
) {
  await requireHouseholdMember(ctx, householdId);
  const reminder = await ctx.db.get(reminderId);

  if (!reminder || reminder.householdId !== householdId) {
    throw new Error("Reminder not found.");
  }

  return reminder;
}

async function ensureTargetIsMember(
  ctx: MutationCtx | QueryCtx,
  householdId: Id<"households">,
  targetUserId?: Id<"users">,
) {
  if (!targetUserId) {
    return;
  }

  await requireHouseholdMember(ctx, householdId, targetUserId);
}

function isActiveManualReminder(reminder: Doc<"reminders">) {
  return (
    reminder.entityType === "manual" &&
    reminder.status !== "cancelled" &&
    reminder.status !== "dismissed"
  );
}

function requireEntityId(entityType: ReminderEntityType, entityId?: string) {
  if (entityType === "manual") {
    return undefined;
  }

  return cleanText(entityId ?? "", "Linked entity", 200);
}

export const listManual = query({
  args: {
    householdId: v.id("households"),
  },
  handler: async (ctx, args) => {
    await requireHouseholdMember(ctx, args.householdId);

    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .take(100);

    return reminders
      .filter(isActiveManualReminder)
      .sort((left, right) => left.remindAt - right.remindAt);
  },
});

export const create = mutation({
  args: {
    householdId: v.id("households"),
    title: v.optional(v.string()),
    note: v.optional(v.string()),
    remindAt: v.number(),
    targetUserId: v.optional(v.id("users")),
    entityType: v.optional(reminderEntityTypeValidator),
    entityId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);
    await ensureTargetIsMember(ctx, args.householdId, args.targetUserId);

    const now = Date.now();
    const entityType = args.entityType ?? "manual";
    const cleanTitle =
      entityType === "manual"
        ? cleanText(args.title ?? "", "Reminder title", 140)
        : args.title === undefined
          ? undefined
          : cleanText(args.title, "Reminder title", 140);
    const reminderId = await ctx.db.insert("reminders", {
      householdId: args.householdId,
      entityType,
      entityId: requireEntityId(entityType, args.entityId),
      title: cleanTitle,
      note: cleanOptionalText(args.note),
      targetUserId: args.targetUserId,
      createdByUserId: user._id,
      remindAt: args.remindAt,
      status: "scheduled",
      channel: "in_app",
      dismissedAt: undefined,
      createdAt: now,
      updatedAt: now,
    });

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.reminderCreated,
      entityType: ENTITY_TYPES.reminder,
      entityId: reminderId,
      message: cleanTitle
        ? `Created reminder "${cleanTitle}".`
        : "Created reminder.",
    });

    return reminderId;
  },
});

export const update = mutation({
  args: {
    householdId: v.id("households"),
    reminderId: v.id("reminders"),
    title: v.optional(v.string()),
    note: v.optional(v.string()),
    remindAt: v.optional(v.number()),
    targetUserId: v.optional(v.union(v.id("users"), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);
    await requireReminderInHousehold(ctx, args.householdId, args.reminderId);

    if (args.targetUserId) {
      await ensureTargetIsMember(ctx, args.householdId, args.targetUserId);
    }

    const patch: Partial<Doc<"reminders">> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) {
      patch.title = cleanText(args.title, "Reminder title", 140);
    }
    if (args.note !== undefined) {
      patch.note = cleanOptionalText(args.note);
    }
    if (args.remindAt !== undefined) {
      patch.remindAt = args.remindAt;
    }
    if (args.targetUserId !== undefined) {
      patch.targetUserId = args.targetUserId ?? undefined;
    }

    await ctx.db.patch(args.reminderId, patch);

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.reminderUpdated,
      entityType: ENTITY_TYPES.reminder,
      entityId: args.reminderId,
      message: "Updated reminder.",
    });

    return args.reminderId;
  },
});

export const dismiss = mutation({
  args: {
    householdId: v.id("households"),
    reminderId: v.id("reminders"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);
    await requireReminderInHousehold(ctx, args.householdId, args.reminderId);
    const now = Date.now();

    await ctx.db.patch(args.reminderId, {
      status: "dismissed",
      dismissedAt: now,
      updatedAt: now,
    });

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.reminderDismissed,
      entityType: ENTITY_TYPES.reminder,
      entityId: args.reminderId,
      message: "Dismissed reminder.",
    });

    return args.reminderId;
  },
});

export const cancel = mutation({
  args: {
    householdId: v.id("households"),
    reminderId: v.id("reminders"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);
    await requireReminderInHousehold(ctx, args.householdId, args.reminderId);

    await ctx.db.patch(args.reminderId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.reminderCancelled,
      entityType: ENTITY_TYPES.reminder,
      entityId: args.reminderId,
      message: "Cancelled reminder.",
    });

    return args.reminderId;
  },
});

export const remove = mutation({
  args: {
    householdId: v.id("households"),
    reminderId: v.id("reminders"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);
    const reminder = await requireReminderInHousehold(
      ctx,
      args.householdId,
      args.reminderId,
    );

    await ctx.db.delete(args.reminderId);

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.reminderDeleted,
      entityType: ENTITY_TYPES.reminder,
      entityId: args.reminderId,
      message: reminder.title
        ? `Deleted reminder "${reminder.title}".`
        : "Deleted reminder.",
    });

    return args.reminderId;
  },
});
