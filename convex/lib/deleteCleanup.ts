import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

type LinkedReminderEntityType = "task" | "bill" | "event" | "document";
type LinkedDocumentEntityType = "task" | "bill" | "expense" | "note";

export async function deleteLinkedReminders(
  ctx: MutationCtx,
  householdId: Id<"households">,
  entityType: LinkedReminderEntityType,
  entityId: string,
) {
  const reminders = await ctx.db
    .query("reminders")
    .withIndex("by_household", (q) => q.eq("householdId", householdId))
    .collect();

  for (const reminder of reminders) {
    if (reminder.entityType === entityType && reminder.entityId === entityId) {
      await ctx.db.delete(reminder._id);
    }
  }
}

export async function deleteTaggingsForEntity(
  ctx: MutationCtx,
  householdId: Id<"households">,
  entityType: string,
  entityId: string,
) {
  const taggings = await ctx.db
    .query("taggings")
    .withIndex("by_entity", (q) =>
      q.eq("entityType", entityType).eq("entityId", entityId),
    )
    .collect();

  for (const tagging of taggings) {
    if (tagging.householdId === householdId) {
      await ctx.db.delete(tagging._id);
    }
  }
}

export async function deleteDocumentLinksForEntity(
  ctx: MutationCtx,
  householdId: Id<"households">,
  linkedEntityType: LinkedDocumentEntityType,
  linkedEntityId: string,
) {
  const links = await ctx.db
    .query("documentLinks")
    .withIndex("by_household", (q) => q.eq("householdId", householdId))
    .collect();

  for (const link of links) {
    if (
      link.linkedEntityType === linkedEntityType &&
      link.linkedEntityId === linkedEntityId
    ) {
      await ctx.db.delete(link._id);
    }
  }
}
