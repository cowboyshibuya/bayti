import { v } from "convex/values";

import { query, type QueryCtx } from "./_generated/server";
import { requireHouseholdMember } from "./lib/permissions";
import type { Doc } from "./_generated/dataModel";
import { enrichUser } from "./lib/users";

async function withActor(ctx: QueryCtx, event: Doc<"activityEvents">) {
  return {
    ...event,
    actor: event.actorUserId
      ? await enrichUser(ctx, await ctx.db.get(event.actorUserId))
      : null,
  };
}

export const listRecent = query({
  args: {
    householdId: v.id("households"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireHouseholdMember(ctx, args.householdId);

    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_household_created_at", (q) =>
        q.eq("householdId", args.householdId),
      )
      .order("desc")
      .take(args.limit ?? 20);

    return await Promise.all(events.map((event) => withActor(ctx, event)));
  },
});

export const listForEntity = query({
  args: {
    householdId: v.id("households"),
    entityType: v.string(),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireHouseholdMember(ctx, args.householdId);

    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId),
      )
      .collect();

    const filteredEvents = events
      .filter((event) => event.householdId === args.householdId)
      .sort((left, right) => right.createdAt - left.createdAt);

    return await Promise.all(filteredEvents.map((event) => withActor(ctx, event)));
  },
});
