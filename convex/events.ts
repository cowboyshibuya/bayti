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
import {
  deleteLinkedReminders,
  deleteTaggingsForEntity,
} from "./lib/deleteCleanup";
import { eventStatusValidator } from "./lib/validators";

type EventStatus = Doc<"events">["status"];

function cleanTitle(title: string) {
  const trimmed = title.trim();
  if (trimmed.length < 1) throw new Error("Event title is required.");
  if (trimmed.length > 140) throw new Error("Event title must be 140 characters or fewer.");
  return trimmed;
}

function cleanString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function validateEventRange(startsAt: number, endsAt?: number) {
  if (endsAt !== undefined && endsAt <= startsAt) {
    throw new Error("Event end time must be after the start time.");
  }
}

async function requireEventInHousehold(
  ctx: QueryCtx | MutationCtx,
  householdId: Id<"households">,
  eventId: Id<"events">,
) {
  await requireHouseholdMember(ctx, householdId);
  const event = await ctx.db.get(eventId);
  if (!event || event.householdId !== householdId) {
    throw new Error("Event not found.");
  }
  return event;
}

async function canRemoveEvent(
  ctx: MutationCtx,
  householdId: Id<"households">,
  event: Doc<"events">,
  currentUserId: Id<"users">,
) {
  const membership = await requireHouseholdMember(ctx, householdId, currentUserId);
  if (membership.role === "admin" || membership.role === "adult" || event.createdByUserId === currentUserId) {
    return;
  }
  throw new Error("You do not have permission to remove this event.");
}

async function setEventStatus(
  ctx: MutationCtx,
  input: {
    householdId: Id<"households">;
    eventId: Id<"events">;
    status: EventStatus;
  },
) {
  const user = await requireCurrentUser(ctx);
  await requireHouseholdRole(ctx, input.householdId, WRITE_ROLES);
  await requireEventInHousehold(ctx, input.householdId, input.eventId);

  await ctx.db.patch(input.eventId, {
    status: input.status,
    updatedAt: Date.now(),
  });

  await writeActivityEvent(ctx, {
    householdId: input.householdId,
    actorUserId: user._id,
    action: ACTIVITY_ACTIONS.eventUpdated,
    entityType: ENTITY_TYPES.event,
    entityId: input.eventId,
    message: `Changed event status to ${input.status}.`,
  });

  return input.eventId;
}

export const list = query({
  args: {
    householdId: v.id("households"),
    view: v.optional(
      v.union(
        v.literal("upcoming"),
        v.literal("past"),
        v.literal("all"),
        v.literal("mine"),
      ),
    ),
    status: v.optional(eventStatusValidator),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdMember(ctx, args.householdId, user._id);

    const now = Date.now();

    let events = await ctx.db
      .query("events")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .collect();

    if (args.status) {
      events = events.filter((event) => event.status === args.status);
    }

    if (args.view === "upcoming") {
      events = events.filter(
        (event) => event.startsAt >= now && event.status !== "cancelled",
      );
    }

    if (args.view === "past") {
      events = events.filter(
        (event) => event.startsAt < now || event.status === "completed",
      );
    }

    if (args.view === "mine") {
      events = events.filter((event) => event.ownerUserId === user._id);
    }

    return events.sort((left, right) => {
      const diff = left.startsAt - right.startsAt;
      if (diff !== 0) return diff;
      return right.updatedAt - left.updatedAt;
    });
  },
});

export const get = query({
  args: {
    householdId: v.id("households"),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    return await requireEventInHousehold(ctx, args.householdId, args.eventId);
  },
});

export const create = mutation({
  args: {
    householdId: v.id("households"),
    title: v.string(),
    description: v.optional(v.string()),
    note: v.optional(v.string()),
    startsAt: v.number(),
    endsAt: v.optional(v.number()),
    isAllDay: v.optional(v.boolean()),
    location: v.optional(v.string()),
    status: v.optional(eventStatusValidator),
    ownerUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);

    if (args.ownerUserId) {
      await requireHouseholdMember(ctx, args.householdId, args.ownerUserId);
    }

    validateEventRange(args.startsAt, args.endsAt);

    const now = Date.now();
    const eventId = await ctx.db.insert("events", {
      householdId: args.householdId,
      title: cleanTitle(args.title),
      description: cleanString(args.description),
      note: cleanString(args.note),
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      isAllDay: args.isAllDay ?? false,
      location: cleanString(args.location),
      status: args.status ?? "upcoming",
      ownerUserId: args.ownerUserId,
      createdByUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.eventCreated,
      entityType: ENTITY_TYPES.event,
      entityId: eventId,
      message: `Created event "${args.title.trim()}".`,
    });

    return eventId;
  },
});

export const update = mutation({
  args: {
    householdId: v.id("households"),
    eventId: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    note: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.union(v.number(), v.null())),
    isAllDay: v.optional(v.boolean()),
    location: v.optional(v.string()),
    status: v.optional(eventStatusValidator),
    ownerUserId: v.optional(v.union(v.id("users"), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);
    const event = await requireEventInHousehold(ctx, args.householdId, args.eventId);

    if (args.ownerUserId) {
      await requireHouseholdMember(ctx, args.householdId, args.ownerUserId);
    }

    validateEventRange(
      args.startsAt ?? event.startsAt,
      args.endsAt === undefined ? event.endsAt : args.endsAt ?? undefined,
    );

    const patch: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.title !== undefined) patch.title = cleanTitle(args.title);
    if (args.description !== undefined) patch.description = cleanString(args.description);
    if (args.note !== undefined) patch.note = cleanString(args.note);
    if (args.startsAt !== undefined) patch.startsAt = args.startsAt;
    if (args.endsAt !== undefined) patch.endsAt = args.endsAt ?? undefined;
    if (args.isAllDay !== undefined) patch.isAllDay = args.isAllDay;
    if (args.location !== undefined) patch.location = cleanString(args.location);
    if (args.status !== undefined) patch.status = args.status;
    if (args.ownerUserId !== undefined) patch.ownerUserId = args.ownerUserId ?? undefined;

    await ctx.db.patch(args.eventId, patch);

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.eventUpdated,
      entityType: ENTITY_TYPES.event,
      entityId: args.eventId,
      message: "Updated event details.",
    });

    return args.eventId;
  },
});

export const updateStatus = mutation({
  args: {
    householdId: v.id("households"),
    eventId: v.id("events"),
    status: eventStatusValidator,
  },
  handler: async (ctx, args) => {
    return await setEventStatus(ctx, args);
  },
});

export const cancel = mutation({
  args: {
    householdId: v.id("households"),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const event = await requireEventInHousehold(ctx, args.householdId, args.eventId);
    await canRemoveEvent(ctx, args.householdId, event, user._id);

    await ctx.db.patch(args.eventId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.eventCancelled,
      entityType: ENTITY_TYPES.event,
      entityId: args.eventId,
      message: `Cancelled event "${event.title}".`,
    });

    return args.eventId;
  },
});

export const remove = mutation({
  args: {
    householdId: v.id("households"),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const event = await requireEventInHousehold(ctx, args.householdId, args.eventId);
    await canRemoveEvent(ctx, args.householdId, event, user._id);

    await deleteLinkedReminders(ctx, args.householdId, "event", args.eventId);
    await deleteTaggingsForEntity(ctx, args.householdId, ENTITY_TYPES.event, args.eventId);
    await ctx.db.delete(args.eventId);

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.eventDeleted,
      entityType: ENTITY_TYPES.event,
      entityId: args.eventId,
      message: `Deleted event "${event.title}".`,
    });

    return args.eventId;
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

    const events = await ctx.db
      .query("events")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .collect();

    const upcoming = events
      .filter((event) => event.startsAt >= now && event.status !== "cancelled")
      .sort((left, right) => left.startsAt - right.startsAt)
      .slice(0, 5);

    return {
      upcomingEvents: upcoming,
      todayEvents: events
        .filter(
          (event) =>
            event.startsAt >= start.getTime() &&
            event.startsAt <= end.getTime() &&
            event.status !== "cancelled",
        )
        .sort((left, right) => left.startsAt - right.startsAt)
        .slice(0, 5),
      totalUpcoming: events.filter(
        (event) => event.startsAt >= now && event.status !== "cancelled",
      ).length,
      totalToday: events.filter(
        (event) =>
          event.startsAt >= start.getTime() &&
          event.startsAt <= end.getTime() &&
          event.status !== "cancelled",
      ).length,
    };
  },
});
