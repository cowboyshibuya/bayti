import { v } from "convex/values";

import type { Id, TableNames } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  ACTIVITY_ACTIONS,
  ADMIN_ROLES,
  ENTITY_TYPES,
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
} from "./lib/constants";
import { writeActivityEvent } from "./lib/activity";
import {
  getCurrentUser,
  normalizeHouseholdRole,
  requireCurrentUser,
  requireHouseholdMember,
  requireHouseholdRole,
  requireIdentity,
} from "./lib/permissions";
import { householdNameValidator, inviteCodeValidator } from "./lib/validators";
import { enrichUser } from "./lib/users";

const DELETE_BATCH_SIZE = 100;

function normalizeInviteCode(inviteCode: string) {
  return inviteCode.trim().toUpperCase().replaceAll("-", "");
}

function cleanHouseholdName(name: string) {
  const trimmed = name.trim();

  if (trimmed.length < 2) {
    throw new Error("Household name must be at least 2 characters.");
  }

  if (trimmed.length > 80) {
    throw new Error("Household name must be 80 characters or fewer.");
  }

  return trimmed;
}

function createInviteCode() {
  let code = "";

  for (let index = 0; index < INVITE_CODE_LENGTH; index += 1) {
    code += INVITE_CODE_ALPHABET[
      Math.floor(Math.random() * INVITE_CODE_ALPHABET.length)
    ];
  }

  return code;
}

async function createUniqueInviteCode(ctx: MutationCtx) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const inviteCode = createInviteCode();
    const existing = await ctx.db
      .query("households")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", inviteCode))
      .unique();

    if (!existing) {
      return inviteCode;
    }
  }

  throw new Error("Could not generate a unique invite code.");
}

function assertConfirmationName(
  household: { name: string },
  confirmationName: string,
) {
  if (confirmationName.trim() !== household.name) {
    throw new Error("Confirmation name does not match this household.");
  }
}

async function deleteRows(
  ctx: MutationCtx,
  rows: readonly { _id: Id<TableNames> }[],
) {
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
}

async function deleteHouseholdAppData(
  ctx: MutationCtx,
  householdId: Id<"households">,
) {
  while (true) {
    const messages = await ctx.db
      .query("stellaMessages")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .take(DELETE_BATCH_SIZE);

    if (messages.length === 0) {
      break;
    }

    await deleteRows(ctx, messages);
  }

  while (true) {
    const conversations = await ctx.db
      .query("stellaConversations")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .take(DELETE_BATCH_SIZE);

    if (conversations.length === 0) {
      break;
    }

    await deleteRows(ctx, conversations);
  }

  while (true) {
    const settings = await ctx.db
      .query("stellaSettings")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .take(DELETE_BATCH_SIZE);

    if (settings.length === 0) {
      break;
    }

    await deleteRows(ctx, settings);
  }

  while (true) {
    const taggings = await ctx.db
      .query("taggings")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .take(DELETE_BATCH_SIZE);

    if (taggings.length === 0) {
      break;
    }

    await deleteRows(ctx, taggings);
  }

  while (true) {
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .take(DELETE_BATCH_SIZE);

    if (tags.length === 0) {
      break;
    }

    await deleteRows(ctx, tags);
  }

  while (true) {
    const documentLinks = await ctx.db
      .query("documentLinks")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .take(DELETE_BATCH_SIZE);

    if (documentLinks.length === 0) {
      break;
    }

    await deleteRows(ctx, documentLinks);
  }

  while (true) {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .take(DELETE_BATCH_SIZE);

    if (documents.length === 0) {
      break;
    }

    for (const document of documents) {
      if (document.storageId) {
        await ctx.storage.delete(document.storageId);
      }

      await ctx.db.delete(document._id);
    }
  }

  while (true) {
    const folders = await ctx.db
      .query("documentFolders")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .take(DELETE_BATCH_SIZE);

    if (folders.length === 0) {
      break;
    }

    await deleteRows(ctx, folders);
  }

  while (true) {
    const lists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .take(DELETE_BATCH_SIZE);

    if (lists.length === 0) {
      break;
    }

    for (const list of lists) {
      while (true) {
        const items = await ctx.db
          .query("shoppingItems")
          .withIndex("by_shopping_list", (q) => q.eq("shoppingListId", list._id))
          .take(DELETE_BATCH_SIZE);

        if (items.length === 0) {
          break;
        }

        await deleteRows(ctx, items);
      }

      await ctx.db.delete(list._id);
    }
  }

  while (true) {
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .take(DELETE_BATCH_SIZE);

    if (expenses.length === 0) {
      break;
    }

    for (const expense of expenses) {
      while (true) {
        const splits = await ctx.db
          .query("expenseSplits")
          .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
          .take(DELETE_BATCH_SIZE);

        if (splits.length === 0) {
          break;
        }

        await deleteRows(ctx, splits);
      }

      await ctx.db.delete(expense._id);
    }
  }

  while (true) {
    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .take(DELETE_BATCH_SIZE);

    if (reminders.length === 0) {
      break;
    }

    await deleteRows(ctx, reminders);
  }

  while (true) {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .take(DELETE_BATCH_SIZE);

    if (tasks.length === 0) {
      break;
    }

    await deleteRows(ctx, tasks);
  }

  while (true) {
    const bills = await ctx.db
      .query("bills")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .take(DELETE_BATCH_SIZE);

    if (bills.length === 0) {
      break;
    }

    await deleteRows(ctx, bills);
  }

  while (true) {
    const events = await ctx.db
      .query("events")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .take(DELETE_BATCH_SIZE);

    if (events.length === 0) {
      break;
    }

    await deleteRows(ctx, events);
  }

  while (true) {
    const recurrenceRules = await ctx.db
      .query("recurrenceRules")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .take(DELETE_BATCH_SIZE);

    if (recurrenceRules.length === 0) {
      break;
    }

    await deleteRows(ctx, recurrenceRules);
  }

  while (true) {
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .take(DELETE_BATCH_SIZE);

    if (notes.length === 0) {
      break;
    }

    await deleteRows(ctx, notes);
  }

  while (true) {
    const activityEvents = await ctx.db
      .query("activityEvents")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .take(DELETE_BATCH_SIZE);

    if (activityEvents.length === 0) {
      break;
    }

    await deleteRows(ctx, activityEvents);
  }
}

async function countAdmins(ctx: MutationCtx, householdId: Id<"households">) {
  const memberships = await ctx.db
    .query("householdMembers")
    .withIndex("by_household", (q) => q.eq("householdId", householdId))
    .collect();

  return memberships.filter(
    (membership) => normalizeHouseholdRole(membership.role) === "admin",
  ).length;
}

export const getOnboardingState = query({
  args: {
    activeHouseholdId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    const user = await getCurrentUser(ctx);

    if (!user) {
      return {
        needsUserSync: true,
        user: null,
        household: null,
        membership: null,
        households: [],
      };
    }

    const memberships = await ctx.db
      .query("householdMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(50);

    if (memberships.length === 0) {
      return {
        needsUserSync: false,
        user: await enrichUser(ctx, user),
        household: null,
        membership: null,
        households: [],
      };
    }

    const households = [];

    for (const membership of memberships) {
      const household = await ctx.db.get(membership.householdId);

      if (!household) {
        throw new Error("Household record missing.");
      }

      households.push({
        household,
        membership: {
          ...membership,
          role: normalizeHouseholdRole(membership.role),
        },
      });
    }

    const activeHousehold =
      args.activeHouseholdId === null || args.activeHouseholdId === undefined
        ? undefined
        : households.find(
            ({ household }) => household._id === args.activeHouseholdId,
          );

    return {
      needsUserSync: false,
      user: await enrichUser(ctx, user),
      household: activeHousehold?.household ?? null,
      membership: activeHousehold?.membership ?? null,
      households,
    };
  },
});

export const createHousehold = mutation({
  args: {
    name: householdNameValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const now = Date.now();
    const name = cleanHouseholdName(args.name);
    const inviteCode = await createUniqueInviteCode(ctx);
    const householdId = await ctx.db.insert("households", {
      name,
      createdByUserId: user._id,
      inviteCode,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("householdMembers", {
      householdId,
      userId: user._id,
      role: "admin",
      displayName: user.name,
      createdAt: now,
      updatedAt: now,
    });

    await writeActivityEvent(ctx, {
      householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.householdCreated,
      entityType: ENTITY_TYPES.household,
      entityId: householdId,
      message: `${user.name ?? "A family member"} created ${name}.`,
    });

    return householdId;
  },
});

export const joinHousehold = mutation({
  args: {
    inviteCode: inviteCodeValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const inviteCode = normalizeInviteCode(args.inviteCode);

    if (inviteCode.length !== INVITE_CODE_LENGTH) {
      throw new Error("Invite code must be 8 characters.");
    }

    const household = await ctx.db
      .query("households")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", inviteCode))
      .unique();

    if (!household) {
      throw new Error("No household found for that invite code.");
    }

    const existingMembership = await ctx.db
      .query("householdMembers")
      .withIndex("by_household_user", (q) =>
        q.eq("householdId", household._id).eq("userId", user._id),
      )
      .unique();

    if (existingMembership) {
      return household._id;
    }

    const now = Date.now();

    await ctx.db.insert("householdMembers", {
      householdId: household._id,
      userId: user._id,
      role: "adult",
      displayName: user.name,
      createdAt: now,
      updatedAt: now,
    });

    await writeActivityEvent(ctx, {
      householdId: household._id,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.householdJoined,
      entityType: ENTITY_TYPES.household,
      entityId: household._id,
      message: `${user.name ?? "A family member"} joined ${household.name}.`,
    });

    return household._id;
  },
});

export const updateHouseholdName = mutation({
  args: {
    householdId: v.id("households"),
    name: householdNameValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, ADMIN_ROLES);
    const household = await ctx.db.get(args.householdId);

    if (!household) {
      throw new Error("Household not found.");
    }

    const name = cleanHouseholdName(args.name);

    if (name === household.name) {
      return household._id;
    }

    await ctx.db.patch(household._id, {
      name,
      updatedAt: Date.now(),
    });

    await writeActivityEvent(ctx, {
      householdId: household._id,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.householdUpdated,
      entityType: ENTITY_TYPES.household,
      entityId: household._id,
      message: `${user.name ?? "A family member"} renamed ${household.name} to ${name}.`,
    });

    return household._id;
  },
});

export const leaveHousehold = mutation({
  args: {
    householdId: v.id("households"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const membership = await requireHouseholdMember(
      ctx,
      args.householdId,
      user._id,
    );
    const household = await ctx.db.get(args.householdId);

    if (!household) {
      throw new Error("Household not found.");
    }

    const adminCount = await countAdmins(ctx, args.householdId);

    if (
      normalizeHouseholdRole(membership.role) === "admin" &&
      adminCount <= 1
    ) {
      throw new Error("The last household admin cannot leave.");
    }

    await ctx.db.delete(membership._id);

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: user._id,
      action: ACTIVITY_ACTIONS.memberUpdated,
      entityType: ENTITY_TYPES.member,
      entityId: membership._id,
      message: `${user.name ?? "A family member"} left ${household.name}.`,
    });

    return args.householdId;
  },
});

export const resetHouseholdData = mutation({
  args: {
    householdId: v.id("households"),
    confirmationName: v.string(),
  },
  handler: async (ctx, args) => {
    await requireHouseholdRole(ctx, args.householdId, ADMIN_ROLES);
    const household = await ctx.db.get(args.householdId);

    if (!household) {
      throw new Error("Household not found.");
    }

    assertConfirmationName(household, args.confirmationName);
    await deleteHouseholdAppData(ctx, household._id);
    await ctx.db.patch(household._id, {
      updatedAt: Date.now(),
    });

    return household._id;
  },
});

export const deleteHousehold = mutation({
  args: {
    householdId: v.id("households"),
    confirmationName: v.string(),
  },
  handler: async (ctx, args) => {
    await requireHouseholdRole(ctx, args.householdId, ADMIN_ROLES);
    const household = await ctx.db.get(args.householdId);

    if (!household) {
      throw new Error("Household not found.");
    }

    assertConfirmationName(household, args.confirmationName);
    await deleteHouseholdAppData(ctx, household._id);

    while (true) {
      const memberships = await ctx.db
        .query("householdMembers")
        .withIndex("by_household", (q) =>
          q.eq("householdId", args.householdId),
        )
        .take(DELETE_BATCH_SIZE);

      if (memberships.length === 0) {
        break;
      }

      await deleteRows(ctx, memberships);
    }

    await ctx.db.delete(household._id);

    return household._id;
  },
});

export const getDashboard = query({
  args: {
    householdId: v.id("households"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const membership = await requireHouseholdMember(
      ctx,
      args.householdId,
      user._id,
    );
    const household = await ctx.db.get(args.householdId);

    if (!household) {
      throw new Error("Household not found.");
    }

    const recentActivity = await ctx.db
      .query("activityEvents")
      .withIndex("by_household_created_at", (q) =>
        q.eq("householdId", household._id),
      )
      .order("desc")
      .take(8);
    const recentActivityWithActors = await Promise.all(
      recentActivity.map(async (event) => ({
        ...event,
        actor: event.actorUserId
          ? await enrichUser(ctx, await ctx.db.get(event.actorUserId))
          : null,
      })),
    );

    const now = Date.now();
    const bills = await ctx.db
      .query("bills")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .collect();

    const activeBills = bills.filter(
      (bill) => !["paid", "cancelled"].includes(bill.status),
    );

    const upcomingBills = activeBills
      .filter((bill) => bill.dueAt !== undefined && bill.dueAt >= now)
      .sort((left, right) => (left.dueAt ?? 0) - (right.dueAt ?? 0))
      .slice(0, 5);

    const overdueBills = activeBills
      .filter((bill) => bill.dueAt !== undefined && bill.dueAt < now)
      .sort((left, right) => (left.dueAt ?? 0) - (right.dueAt ?? 0))
      .slice(0, 5);

    const upcomingEvents = await ctx.db
      .query("events")
      .withIndex("by_household_starts", (q) =>
        q.eq("householdId", args.householdId),
      )
      .filter((q) => q.gte(q.field("startsAt"), now))
      .take(5);

    return {
      user: await enrichUser(ctx, user),
      household,
      membership: {
        ...membership,
        role: normalizeHouseholdRole(membership.role),
      },
      recentActivity: recentActivityWithActors,
      todayTasks: [],
      overdueTasks: [],
      upcomingTasks: [],
      upcomingBills,
      overdueBills,
      upcomingEvents,
      recentExpenses: [],
      recentNotes: [],
    };
  },
});
