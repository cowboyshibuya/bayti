import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { ACTIVITY_ACTIONS, ENTITY_TYPES, WRITE_ROLES } from "./lib/constants";
import { writeActivityEvent } from "./lib/activity";
import {
  normalizeHouseholdRole,
  requireCurrentUser,
  requireHouseholdMember,
  requireHouseholdRole,
} from "./lib/permissions";
import {
  deleteDocumentLinksForEntity,
  deleteLinkedReminders,
  deleteTaggingsForEntity,
} from "./lib/deleteCleanup";
import {
  recurrenceFrequencyValidator,
  taskPriorityValidator,
  taskStatusValidator,
  taskTypeValidator,
} from "./lib/validators";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type TaskStatus = Doc<"tasks">["status"];

function cleanTitle(title: string) {
  const trimmed = title.trim();

  if (trimmed.length < 1) {
    throw new Error("Task title is required.");
  }

  if (trimmed.length > 140) {
    throw new Error("Task title must be 140 characters or fewer.");
  }

  return trimmed;
}

function cleanDescription(description?: string) {
  const trimmed = description?.trim();
  return trimmed ? trimmed : undefined;
}

async function requireTaskInHousehold(
  ctx: QueryCtx | MutationCtx,
  householdId: Id<"households">,
  taskId: Id<"tasks">,
) {
  await requireHouseholdMember(ctx, householdId);
  const task = await ctx.db.get(taskId);

  if (!task || task.householdId !== householdId) {
    throw new Error("Task not found.");
  }

  return task;
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

function nextDueAt(
  from: number,
  frequency: Doc<"recurrenceRules">["frequency"],
  interval: number,
) {
  const date = new Date(from);

  if (frequency === "daily") {
    return from + interval * MS_PER_DAY;
  }

  if (frequency === "weekly") {
    return from + interval * 7 * MS_PER_DAY;
  }

  if (frequency === "monthly") {
    date.setMonth(date.getMonth() + interval);
    return date.getTime();
  }

  date.setFullYear(date.getFullYear() + interval);
  return date.getTime();
}

async function canRemoveTask(
  ctx: MutationCtx,
  householdId: Id<"households">,
  task: Doc<"tasks">,
  currentUserId: Id<"users">,
) {
  const membership = await requireHouseholdMember(
    ctx,
    householdId,
    currentUserId,
  );
  const role = normalizeHouseholdRole(membership.role);

  if (
    role === "admin" ||
    role === "adult" ||
    task.createdByUserId === currentUserId
  ) {
    return;
  }

  throw new Error("You do not have permission to remove this task.");
}

async function setTaskStatus(
  ctx: MutationCtx,
  input: {
    householdId: Id<"households">;
    taskId: Id<"tasks">;
    status: TaskStatus;
  },
) {
  const user = await requireCurrentUser(ctx);
  await requireHouseholdRole(ctx, input.householdId, WRITE_ROLES);
  const task = await requireTaskInHousehold(
    ctx,
    input.householdId,
    input.taskId,
  );
  const now = Date.now();
  const completedAt =
    input.status === "done"
      ? (task.completedAt ?? now)
      : task.status === "done"
        ? undefined
        : task.completedAt;

  await ctx.db.patch(input.taskId, {
    status: input.status,
    completedAt,
    updatedAt: now,
  });

  await writeActivityEvent(ctx, {
    householdId: input.householdId,
    actorUserId: user._id,
    action:
      input.status === "done"
        ? ACTIVITY_ACTIONS.taskCompleted
        : ACTIVITY_ACTIONS.taskStatusChanged,
    entityType: ENTITY_TYPES.task,
    entityId: input.taskId,
    message:
      input.status === "done"
        ? `Completed task "${task.title}".`
        : `Changed task status to ${input.status.replaceAll("_", " ")}.`,
  });

  return input.taskId;
}

export const list = query({
  args: {
    householdId: v.id("households"),
    view: v.optional(
      v.union(
        v.literal("today"),
        v.literal("upcoming"),
        v.literal("overdue"),
        v.literal("all"),
        v.literal("mine"),
        v.literal("completed"),
      ),
    ),
    status: v.optional(taskStatusValidator),
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

    let tasks = await ctx.db
      .query("tasks")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .collect();

    if (args.status) {
      tasks = tasks.filter((task) => task.status === args.status);
    }

    if (args.ownerUserId) {
      tasks = tasks.filter((task) => task.ownerUserId === args.ownerUserId);
    }

    if (args.view === "today") {
      tasks = tasks.filter(
        (task) =>
          task.dueAt !== undefined &&
          task.dueAt >= start.getTime() &&
          task.dueAt <= end.getTime() &&
          !["done", "cancelled"].includes(task.status),
      );
    }

    if (args.view === "upcoming") {
      tasks = tasks.filter(
        (task) =>
          task.dueAt !== undefined &&
          task.dueAt > end.getTime() &&
          !["done", "cancelled"].includes(task.status),
      );
    }

    if (args.view === "overdue") {
      tasks = tasks.filter(
        (task) =>
          task.dueAt !== undefined &&
          task.dueAt < now &&
          !["done", "cancelled"].includes(task.status),
      );
    }

    if (args.view === "mine") {
      tasks = tasks.filter((task) => task.ownerUserId === user._id);
    }

    if (args.view === "completed") {
      tasks = tasks.filter((task) => task.status === "done");
    }

    return tasks.sort((left, right) => {
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
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    return await requireTaskInHousehold(ctx, args.householdId, args.taskId);
  },
});

export const getDetails = query({
  args: { householdId: v.id("households"), taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await requireTaskInHousehold(
      ctx,
      args.householdId,
      args.taskId,
    );
    const recurrence = task.recurrenceRuleId
      ? await ctx.db.get(task.recurrenceRuleId)
      : null;
    return {
      task,
      recurrence:
        recurrence?.householdId === args.householdId &&
        recurrence.entityType === "task"
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
    status: v.optional(taskStatusValidator),
    priority: v.optional(taskPriorityValidator),
    taskType: v.optional(taskTypeValidator),
    ownerUserId: v.optional(v.id("users")),
    dueAt: v.optional(v.number()),
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
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);
    await ensureAssigneeIsMember(ctx, args.householdId, args.ownerUserId);

    const now = Date.now();
    let recurrenceRuleId: Id<"recurrenceRules"> | undefined;

    if (args.recurrence) {
      recurrenceRuleId = await ctx.db.insert("recurrenceRules", {
        householdId: args.householdId,
        entityType: "task",
        frequency: args.recurrence.frequency,
        interval: Math.max(1, Math.floor(args.recurrence.interval)),
        startsAt: args.recurrence.startsAt,
        endsAt: args.recurrence.endsAt,
        generateAheadDays: 30,
        createdAt: now,
        updatedAt: now,
      });
    }

    const taskId = await ctx.db.insert("tasks", {
      householdId: args.householdId,
      title: cleanTitle(args.title),
      description: cleanDescription(args.description),
      status: args.status ?? "todo",
      priority: args.priority ?? "medium",
      taskType: args.taskType ?? "one_off",
      ownerUserId: args.ownerUserId,
      dueAt: args.dueAt,
      recurrenceRuleId,
      createdByUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.taskCreated,
      entityType: ENTITY_TYPES.task,
      entityId: taskId,
      message: `Created task "${args.title.trim()}".`,
    });

    return taskId;
  },
});

export const update = mutation({
  args: {
    householdId: v.id("households"),
    taskId: v.id("tasks"),
    status: v.optional(taskStatusValidator),
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
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(taskPriorityValidator),
    taskType: v.optional(taskTypeValidator),
    ownerUserId: v.optional(v.union(v.id("users"), v.null())),
    dueAt: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);
    const task = await requireTaskInHousehold(
      ctx,
      args.householdId,
      args.taskId,
    );

    if (args.ownerUserId) {
      await ensureAssigneeIsMember(ctx, args.householdId, args.ownerUserId);
    }

    let recurrenceRuleId = task.recurrenceRuleId;
    if (args.recurrence !== undefined) {
      if (args.recurrence === null) recurrenceRuleId = undefined;
      else if (recurrenceRuleId) {
        const existingRule = await ctx.db.get(recurrenceRuleId);
        if (
          !existingRule ||
          existingRule.householdId !== args.householdId ||
          existingRule.entityType !== "task"
        )
          throw new Error("Recurrence not found.");
        await ctx.db.patch(recurrenceRuleId, {
          ...args.recurrence,
          interval: Math.max(1, Math.floor(args.recurrence.interval)),
          updatedAt: Date.now(),
        });
      } else
        recurrenceRuleId = await ctx.db.insert("recurrenceRules", {
          ...args.recurrence,
          interval: Math.max(1, Math.floor(args.recurrence.interval)),
          householdId: args.householdId,
          entityType: "task",
          generateAheadDays: 30,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
    }
    await ctx.db.patch(args.taskId, {
      ...(args.title !== undefined ? { title: cleanTitle(args.title) } : {}),
      ...(args.description !== undefined
        ? { description: cleanDescription(args.description) }
        : {}),
      ...(args.priority !== undefined ? { priority: args.priority } : {}),
      ...(args.taskType !== undefined ? { taskType: args.taskType } : {}),
      ...(args.ownerUserId !== undefined
        ? { ownerUserId: args.ownerUserId ?? undefined }
        : {}),
      ...(args.dueAt !== undefined ? { dueAt: args.dueAt ?? undefined } : {}),
      ...(args.status !== undefined
        ? {
            status: args.status,
            completedAt:
              args.status === "done"
                ? (task.completedAt ?? Date.now())
                : undefined,
          }
        : {}),
      ...(args.recurrence !== undefined ? { recurrenceRuleId } : {}),
      updatedAt: Date.now(),
    });

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.taskUpdated,
      entityType: ENTITY_TYPES.task,
      entityId: args.taskId,
      message: "Updated task details.",
    });

    if (args.status !== undefined && args.status !== task.status) {
      await writeActivityEvent(ctx, {
        householdId: args.householdId,
        actorUserId: user._id,
        action:
          args.status === "done"
            ? ACTIVITY_ACTIONS.taskCompleted
            : ACTIVITY_ACTIONS.taskStatusChanged,
        entityType: ENTITY_TYPES.task,
        entityId: args.taskId,
        message: `Changed task status to ${args.status.replaceAll("_", " ")}.`,
      });
    }
    return args.taskId;
  },
});

export const updateStatus = mutation({
  args: {
    householdId: v.id("households"),
    taskId: v.id("tasks"),
    status: taskStatusValidator,
  },
  handler: async (ctx, args) => {
    return await setTaskStatus(ctx, args);
  },
});

export const markDone = mutation({
  args: {
    householdId: v.id("households"),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    return await setTaskStatus(ctx, { ...args, status: "done" });
  },
});

export const cancel = mutation({
  args: {
    householdId: v.id("households"),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const task = await requireTaskInHousehold(
      ctx,
      args.householdId,
      args.taskId,
    );
    await canRemoveTask(ctx, args.householdId, task, user._id);

    await ctx.db.patch(args.taskId, {
      status: "cancelled",
      completedAt: undefined,
      updatedAt: Date.now(),
    });

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.taskCancelled,
      entityType: ENTITY_TYPES.task,
      entityId: args.taskId,
      message: `Cancelled task "${task.title}".`,
    });

    return args.taskId;
  },
});

export const remove = mutation({
  args: {
    householdId: v.id("households"),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const task = await requireTaskInHousehold(
      ctx,
      args.householdId,
      args.taskId,
    );
    await canRemoveTask(ctx, args.householdId, task, user._id);

    await deleteLinkedReminders(ctx, args.householdId, "task", args.taskId);
    await deleteDocumentLinksForEntity(
      ctx,
      args.householdId,
      "task",
      args.taskId,
    );
    await deleteTaggingsForEntity(
      ctx,
      args.householdId,
      ENTITY_TYPES.task,
      args.taskId,
    );
    await ctx.db.delete(args.taskId);

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.taskDeleted,
      entityType: ENTITY_TYPES.task,
      entityId: args.taskId,
      message: `Deleted task "${task.title}".`,
    });

    return args.taskId;
  },
});

export const generateRecurringInstances = mutation({
  args: {
    householdId: v.id("households"),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);
    const template = await requireTaskInHousehold(
      ctx,
      args.householdId,
      args.taskId,
    );

    if (!template.recurrenceRuleId) {
      throw new Error("Task does not have a recurrence rule.");
    }

    const rule = await ctx.db.get(template.recurrenceRuleId);

    if (!rule || rule.householdId !== args.householdId) {
      throw new Error("Recurrence rule not found.");
    }

    const existingChildren = await ctx.db
      .query("tasks")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .filter((q) => q.eq(q.field("parentTaskId"), template._id))
      .collect();
    const existingDueDates = new Set(
      existingChildren.map((task) => task.dueAt),
    );
    const generatedIds: Id<"tasks">[] = [];
    const now = Date.now();
    const horizon = now + rule.generateAheadDays * MS_PER_DAY;
    let dueAt = template.dueAt ?? rule.startsAt;

    while (dueAt <= horizon) {
      if (
        dueAt >= now &&
        !existingDueDates.has(dueAt) &&
        dueAt !== template.dueAt
      ) {
        const childId = await ctx.db.insert("tasks", {
          householdId: args.householdId,
          title: template.title,
          description: template.description,
          status: "todo",
          priority: template.priority,
          taskType: template.taskType,
          ownerUserId: template.ownerUserId,
          createdByUserId: user._id,
          dueAt,
          recurrenceRuleId: rule._id,
          parentTaskId: template._id,
          createdAt: now,
          updatedAt: now,
        });

        generatedIds.push(childId);
      }

      dueAt = nextDueAt(dueAt, rule.frequency, rule.interval);

      if (rule.endsAt && dueAt > rule.endsAt) {
        break;
      }
    }

    if (generatedIds.length > 0) {
      await writeActivityEvent(ctx, {
        householdId: args.householdId,
        actorUserId: user._id,
        action: ACTIVITY_ACTIONS.taskGenerated,
        entityType: ENTITY_TYPES.task,
        entityId: template._id,
        message: `Generated ${generatedIds.length} recurring task instance${
          generatedIds.length === 1 ? "" : "s"
        }.`,
      });
    }

    return generatedIds;
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

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .collect();

    const active = tasks.filter(
      (task) => !["done", "cancelled"].includes(task.status),
    );

    const todayTasks = active
      .filter(
        (task) =>
          task.dueAt !== undefined &&
          task.dueAt >= start.getTime() &&
          task.dueAt <= end.getTime(),
      )
      .sort((left, right) => (left.dueAt ?? 0) - (right.dueAt ?? 0))
      .slice(0, 5);

    const overdueTasks = active
      .filter((task) => task.dueAt !== undefined && task.dueAt < now)
      .sort((left, right) => (left.dueAt ?? 0) - (right.dueAt ?? 0))
      .slice(0, 5);

    const upcomingTasks = active
      .filter((task) => task.dueAt !== undefined && task.dueAt > end.getTime())
      .sort((left, right) => (left.dueAt ?? 0) - (right.dueAt ?? 0))
      .slice(0, 5);

    return {
      todayTasks,
      overdueTasks,
      upcomingTasks,
      totalToday: active.filter(
        (task) =>
          task.dueAt !== undefined &&
          task.dueAt >= start.getTime() &&
          task.dueAt <= end.getTime(),
      ).length,
    };
  },
});
