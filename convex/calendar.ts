import { v } from "convex/values";

import { query } from "./_generated/server";
import {
  requireCurrentUser,
  requireHouseholdMember,
} from "./lib/permissions";

export type CalendarEntry = {
  id: string;
  entityType: "task" | "bill" | "event";
  title: string;
  date: number;
  endDate?: number;
  color: "accent" | "warning" | "info";
  status: string;
  link: string;
};

export const getCalendarEntries = query({
  args: {
    householdId: v.id("households"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdMember(ctx, args.householdId, user._id);

    const [tasks, bills, events] = await Promise.all([
      ctx.db
        .query("tasks")
        .withIndex("by_household_due", (q) =>
          q.eq("householdId", args.householdId),
        )
        .collect(),
      ctx.db
        .query("bills")
        .withIndex("by_household_due", (q) =>
          q.eq("householdId", args.householdId),
        )
        .collect(),
      ctx.db
        .query("events")
        .withIndex("by_household_starts", (q) =>
          q.eq("householdId", args.householdId),
        )
        .collect(),
    ]);

    const entries: CalendarEntry[] = [];

    for (const task of tasks) {
      if (
        task.dueAt !== undefined &&
        task.dueAt >= args.startDate &&
        task.dueAt <= args.endDate &&
        task.status !== "cancelled"
      ) {
        entries.push({
          id: task._id,
          entityType: "task",
          title: task.title,
          date: task.dueAt,
          color: "accent",
          status: task.status,
          link: `/tasks/${task._id}`,
        });
      }
    }

    for (const bill of bills) {
      if (
        bill.dueAt !== undefined &&
        bill.dueAt >= args.startDate &&
        bill.dueAt <= args.endDate &&
        bill.status !== "cancelled"
      ) {
        entries.push({
          id: bill._id,
          entityType: "bill",
          title: bill.title,
          date: bill.dueAt,
          color: "warning",
          status: bill.status,
          link: `/bills/${bill._id}`,
        });
      }
    }

    for (const event of events) {
      if (
        event.startsAt >= args.startDate &&
        event.startsAt <= args.endDate &&
        event.status !== "cancelled"
      ) {
        entries.push({
          id: event._id,
          entityType: "event",
          title: event.title,
          date: event.startsAt,
          endDate: event.endsAt ?? undefined,
          color: "info",
          status: event.status,
          link: `/events/${event._id}`,
        });
      }
    }

    return entries.sort((a, b) => a.date - b.date);
  },
});
