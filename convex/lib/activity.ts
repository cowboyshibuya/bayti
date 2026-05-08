import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function writeActivityEvent(
  ctx: MutationCtx,
  input: {
    householdId: Id<"households">;
    actorUserId?: Id<"users">;
    entityType: string;
    entityId: string;
    action: string;
    message: string;
  },
) {
  return await ctx.db.insert("activityEvents", {
    ...input,
    createdAt: Date.now(),
  });
}
