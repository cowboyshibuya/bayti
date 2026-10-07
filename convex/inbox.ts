import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { requireCurrentUser, requireHouseholdMember } from "./lib/permissions";
import { enrichUser } from "./lib/users";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const inboxViewValidator = v.union(
  v.literal("all"),
  v.literal("mine"),
  v.literal("overdue"),
  v.literal("due_soon"),
  v.literal("today"),
  v.literal("reminders"),
);

type InboxSeverity = "overdue" | "today" | "due_soon" | "upcoming";
type InboxKind = "task" | "bill" | "event" | "document" | "reminder";
type InboxView =
  "all" | "mine" | "overdue" | "due_soon" | "today" | "reminders";

type InboxItem = {
  id: string;
  kind: InboxKind;
  entityType: "task" | "bill" | "event" | "document" | "manual";
  entityId: string | null;
  reminderId: Id<"reminders"> | null;
  title: string;
  description: string | null;
  dueAt: number;
  severity: InboxSeverity;
  status: string;
  href: string;
  ownerUserId: Id<"users"> | null;
  targetUserId: Id<"users"> | null;
  user: Doc<"users"> | null;
};

function dayBounds(nowTime: number) {
  const start = new Date(nowTime);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  return { start: start.getTime(), end: end.getTime() };
}

function severityFor(
  timestamp: number,
  nowTime: number,
  todayEnd: number,
): InboxSeverity {
  if (timestamp < nowTime) {
    return "overdue" satisfies InboxSeverity;
  }

  if (timestamp <= todayEnd) {
    return "today" satisfies InboxSeverity;
  }

  return "due_soon" satisfies InboxSeverity;
}

function shouldIncludeMine(
  item: Pick<InboxItem, "kind" | "ownerUserId" | "targetUserId">,
  currentUserId: Id<"users">,
) {
  return (
    item.ownerUserId === currentUserId ||
    item.targetUserId === currentUserId ||
    (item.kind === "reminder" && !item.targetUserId)
  );
}

function matchesView(
  item: InboxItem,
  view: InboxView,
  currentUserId: Id<"users">,
) {
  if (view === "all") return true;
  if (view === "mine") return shouldIncludeMine(item, currentUserId);
  if (view === "reminders") return item.kind === "reminder";
  return item.severity === view;
}

async function getUser(ctx: QueryCtx, userId?: Id<"users"> | null) {
  return userId ? await enrichUser(ctx, await ctx.db.get(userId)) : null;
}

async function withUser(ctx: QueryCtx, item: Omit<InboxItem, "user">) {
  return {
    ...item,
    user: await getUser(ctx, item.targetUserId ?? item.ownerUserId),
  };
}

async function readRows<T>(rows: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const row of rows) result.push(row);
  return result;
}

async function buildInboxItems(
  ctx: QueryCtx,
  householdId: Id<"households">,
  windowDays: number,
) {
  const nowTime = Date.now();
  const { start: todayStart, end: todayEnd } = dayBounds(nowTime);
  const windowEnd = nowTime + windowDays * MS_PER_DAY;

  const [tasks, bills, events, documents, reminders] = await Promise.all([
    readRows(
      ctx.db
        .query("tasks")
        .withIndex("by_household", (q) => q.eq("householdId", householdId)),
    ),
    readRows(
      ctx.db
        .query("bills")
        .withIndex("by_household", (q) => q.eq("householdId", householdId)),
    ),
    readRows(
      ctx.db
        .query("events")
        .withIndex("by_household_starts", (q) =>
          q.eq("householdId", householdId).gte("startsAt", todayStart),
        ),
    ),
    readRows(
      ctx.db
        .query("documents")
        .withIndex("by_household", (q) => q.eq("householdId", householdId)),
    ),
    readRows(
      ctx.db
        .query("reminders")
        .withIndex("by_household", (q) => q.eq("householdId", householdId)),
    ),
  ]);

  const taskItems = tasks
    .filter(
      (task) =>
        task.dueAt !== undefined &&
        task.dueAt <= windowEnd &&
        !["done", "cancelled"].includes(task.status),
    )
    .map((task) => ({
      id: `task:${task._id}`,
      kind: "task" as const,
      entityType: "task" as const,
      entityId: task._id,
      reminderId: null,
      title: task.title,
      description: task.description ?? null,
      dueAt: task.dueAt!,
      severity: severityFor(task.dueAt!, nowTime, todayEnd),
      status: task.status,
      href: `/tasks/${task._id}`,
      ownerUserId: task.ownerUserId ?? null,
      targetUserId: null,
    }));

  const billItems = bills
    .filter(
      (bill) =>
        bill.dueAt !== undefined &&
        bill.dueAt <= windowEnd &&
        !["paid", "cancelled"].includes(bill.status),
    )
    .map((bill) => ({
      id: `bill:${bill._id}`,
      kind: "bill" as const,
      entityType: "bill" as const,
      entityId: bill._id,
      reminderId: null,
      title: bill.title,
      description: bill.provider ?? bill.description ?? null,
      dueAt: bill.dueAt!,
      severity: severityFor(bill.dueAt!, nowTime, todayEnd),
      status: bill.status,
      href: `/bills/${bill._id}`,
      ownerUserId: bill.ownerUserId ?? null,
      targetUserId: null,
    }));

  const eventItems = events
    .filter(
      (event) =>
        event.startsAt <= windowEnd &&
        !["completed", "cancelled"].includes(event.status),
    )
    .map((event) => ({
      id: `event:${event._id}`,
      kind: "event" as const,
      entityType: "event" as const,
      entityId: event._id,
      reminderId: null,
      title: event.title,
      description: event.location ?? event.description ?? null,
      dueAt: event.startsAt,
      severity: severityFor(event.startsAt, nowTime, todayEnd),
      status: event.status,
      href: `/events/${event._id}`,
      ownerUserId: event.ownerUserId ?? null,
      targetUserId: null,
    }));

  const documentItems = documents
    .filter(
      (document) =>
        document.expiresAt !== undefined && document.expiresAt <= windowEnd,
    )
    .map((document) => ({
      id: `document:${document._id}`,
      kind: "document" as const,
      entityType: "document" as const,
      entityId: document._id,
      reminderId: null,
      title: document.title,
      description: document.vendor ?? document.fileName ?? null,
      dueAt: document.expiresAt!,
      severity: severityFor(document.expiresAt!, nowTime, todayEnd),
      status: "expiring",
      href: `/documents?document=${document._id}`,
      ownerUserId: document.uploadedByUserId,
      targetUserId: null,
    }));

  const reminderItems = reminders
    .filter(
      (reminder) =>
        reminder.entityType === "manual" &&
        reminder.status !== "cancelled" &&
        reminder.status !== "dismissed" &&
        reminder.remindAt <= windowEnd,
    )
    .map((reminder) => ({
      id: `reminder:${reminder._id}`,
      kind: "reminder" as const,
      entityType: "manual" as const,
      entityId: null,
      reminderId: reminder._id,
      title: reminder.title ?? "Reminder",
      description: reminder.note ?? null,
      dueAt: reminder.remindAt,
      severity: severityFor(reminder.remindAt, nowTime, todayEnd),
      status: reminder.status,
      href: "/inbox",
      ownerUserId: reminder.createdByUserId ?? null,
      targetUserId: reminder.targetUserId ?? null,
    }));

  const items = [
    ...taskItems,
    ...billItems,
    ...eventItems,
    ...documentItems,
    ...reminderItems,
  ];

  const enrichedItems = await Promise.all(
    items.map((item) => withUser(ctx, item)),
  );

  return enrichedItems.sort((left, right) => {
    const severityOrder: Record<InboxSeverity, number> = {
      overdue: 0,
      today: 1,
      due_soon: 2,
      upcoming: 3,
    };
    const severityDiff =
      severityOrder[left.severity] - severityOrder[right.severity];
    if (severityDiff !== 0) return severityDiff;
    return left.dueAt - right.dueAt;
  });
}

export const list = query({
  args: {
    householdId: v.id("households"),
    view: v.optional(inboxViewValidator),
    windowDays: v.optional(v.number()),
    limit: v.optional(v.number()),
    controls: v.optional(
      v.object({
        search: v.string(),
        sort: v.string(),
        filters: v.record(v.string(), v.string()),
        from: v.string(),
        to: v.string(),
        fromAt: v.optional(v.number()),
        toAt: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx);
    await requireHouseholdMember(ctx, args.householdId, currentUser._id);

    const view = args.view ?? "all";
    const windowDays = Math.max(1, Math.min(args.windowDays ?? 7, 60));
    const limit = Math.max(1, Math.min(args.limit ?? 50, 100));
    const items = await buildInboxItems(ctx, args.householdId, windowDays);

    const controls = args.controls;
    const filtered = items.filter((item) => {
      if (!matchesView(item, view, currentUser._id)) return false;
      if (!controls) return true;
      if (!item.title.toLowerCase().includes(controls.search.toLowerCase()))
        return false;
      if (controls.filters.status && item.status !== controls.filters.status)
        return false;
      if (
        controls.filters.ownerUserId &&
        (item.ownerUserId ?? "unassigned") !== controls.filters.ownerUserId
      )
        return false;
      if (
        controls.filters.targetUserId &&
        (item.targetUserId ?? "unassigned") !== controls.filters.targetUserId
      )
        return false;
      const from =
        controls.fromAt ??
        (controls.from
          ? new Date(`${controls.from}T00:00`).getTime()
          : -Infinity);
      const to =
        controls.toAt ??
        (controls.to
          ? new Date(`${controls.to}T23:59:59.999`).getTime()
          : Infinity);
      return item.dueAt >= from && item.dueAt <= to;
    });
    if (controls)
      filtered.sort(
        (a, b) =>
          (controls.sort === "title"
            ? a.title.localeCompare(b.title)
            : controls.sort === "date-desc"
              ? b.dueAt - a.dueAt
              : a.dueAt - b.dueAt) || a.id.localeCompare(b.id),
      );
    return filtered.slice(0, limit);
  },
});

export const count = query({
  args: {
    householdId: v.id("households"),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx);
    await requireHouseholdMember(ctx, args.householdId, currentUser._id);
    const items = await buildInboxItems(ctx, args.householdId, 7);

    return items.length;
  },
});
