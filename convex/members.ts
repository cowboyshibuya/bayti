import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { ACTIVITY_ACTIONS, ADMIN_ROLES, ENTITY_TYPES } from "./lib/constants";
import { writeActivityEvent } from "./lib/activity";
import {
  normalizeHouseholdRole,
  requireCurrentUser,
  requireHouseholdMember,
  requireHouseholdRole,
} from "./lib/permissions";
import { householdRoleValidator } from "./lib/validators";
import { enrichUser } from "./lib/users";

export const list = query({
  args: {
    householdId: v.id("households"),
  },
  handler: async (ctx, args) => {
    await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, ADMIN_ROLES);

    const memberships = await ctx.db
      .query("householdMembers")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .collect();

    return await Promise.all(
      memberships.map(async (membership) => ({
        membership: {
          ...membership,
          role: normalizeHouseholdRole(membership.role),
        },
        user: await enrichUser(ctx, await ctx.db.get(membership.userId)),
      })),
    );
  },
});

export const listAssignable = query({
  args: {
    householdId: v.id("households"),
  },
  handler: async (ctx, args) => {
    await requireHouseholdMember(ctx, args.householdId);

    const memberships = await ctx.db
      .query("householdMembers")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .collect();

    return await Promise.all(
      memberships.map(async (membership) => ({
        membership: {
          ...membership,
          role: normalizeHouseholdRole(membership.role),
        },
        user: await enrichUser(ctx, await ctx.db.get(membership.userId)),
      })),
    );
  },
});

export const updateRole = mutation({
  args: {
    householdId: v.id("households"),
    memberId: v.id("householdMembers"),
    role: householdRoleValidator,
  },
  handler: async (ctx, args) => {
    const actor = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, ADMIN_ROLES);

    const membership = await ctx.db.get(args.memberId);

    if (!membership || membership.householdId !== args.householdId) {
      throw new Error("Household member not found.");
    }

    await ctx.db.patch(args.memberId, {
      role: args.role,
      updatedAt: Date.now(),
    });

    await writeActivityEvent(ctx, {
      householdId: args.householdId,
      actorUserId: actor._id,
      action: ACTIVITY_ACTIONS.memberUpdated,
      entityType: ENTITY_TYPES.member,
      entityId: args.memberId,
      message: "Updated a household member role.",
    });

    return args.memberId;
  },
});
