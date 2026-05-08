import { v } from "convex/values";

import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  ACTIVITY_ACTIONS,
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
  requireIdentity,
} from "./lib/permissions";
import { householdNameValidator, inviteCodeValidator } from "./lib/validators";
import { enrichUser } from "./lib/users";

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
      households.find(
        ({ household }) => household._id === args.activeHouseholdId,
      ) ?? households[0];

    return {
      needsUserSync: false,
      user: await enrichUser(ctx, user),
      household: activeHousehold.household,
      membership: activeHousehold.membership,
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
