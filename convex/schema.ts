import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_email", ["email"]),
  households: defineTable({
    name: v.string(),
    createdByUserId: v.id("users"),
    inviteCode: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_created_by", ["createdByUserId"])
    .index("by_invite_code", ["inviteCode"]),

  householdMembers: defineTable({
    householdId: v.id("households"),
    userId: v.id("users"),
    role: v.union(
      v.literal("admin"),
      v.literal("adult"),
      v.literal("child"),
      v.literal("viewer"),
    ),
    displayName: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_user", ["userId"])
    .index("by_household_user", ["householdId", "userId"]),

  tasks: defineTable({
    householdId: v.id("households"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("inbox"),
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("waiting"),
      v.literal("done"),
      v.literal("cancelled"),
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent"),
    ),
    taskType: v.union(
      v.literal("one_off"),
      v.literal("chore"),
      v.literal("bill"),
      v.literal("errand"),
      v.literal("maintenance"),
      v.literal("admin"),
      v.literal("decision"),
      v.literal("follow_up"),
    ),
    ownerUserId: v.optional(v.id("users")),
    createdByUserId: v.id("users"),
    dueAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    recurrenceRuleId: v.optional(v.id("recurrenceRules")),
    parentTaskId: v.optional(v.id("tasks")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_household_status", ["householdId", "status"])
    .index("by_household_owner", ["householdId", "ownerUserId"])
    .index("by_household_due", ["householdId", "dueAt"]),

  recurrenceRules: defineTable({
    householdId: v.id("households"),
    entityType: v.union(v.literal("task"), v.literal("bill")),
    frequency: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("yearly"),
    ),
    interval: v.number(),
    byWeekday: v.optional(v.array(v.number())),
    byMonthDay: v.optional(v.number()),
    startsAt: v.number(),
    endsAt: v.optional(v.number()),
    generateAheadDays: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_household", ["householdId"]),

  bills: defineTable({
    householdId: v.id("households"),
    title: v.string(),
    description: v.optional(v.string()),
    provider: v.optional(v.string()),
    amountExpected: v.optional(v.number()),
    currency: v.string(),
    dueAt: v.optional(v.number()),
    status: v.union(
      v.literal("upcoming"),
      v.literal("due_soon"),
      v.literal("paid"),
      v.literal("overdue"),
      v.literal("cancelled"),
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent"),
    ),
    ownerUserId: v.optional(v.id("users")),
    autopay: v.boolean(),
    recurrenceRuleId: v.optional(v.id("recurrenceRules")),
    createdByUserId: v.id("users"),
    paidAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_household_status", ["householdId", "status"])
    .index("by_household_due", ["householdId", "dueAt"]),

  events: defineTable({
    householdId: v.id("households"),
    title: v.string(),
    description: v.optional(v.string()),
    note: v.optional(v.string()),
    startsAt: v.number(),
    endsAt: v.optional(v.number()),
    isAllDay: v.boolean(),
    location: v.optional(v.string()),
    status: v.union(
      v.literal("upcoming"),
      v.literal("ongoing"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    ownerUserId: v.optional(v.id("users")),
    createdByUserId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_household_status", ["householdId", "status"])
    .index("by_household_starts", ["householdId", "startsAt"]),

  shoppingLists: defineTable({
    householdId: v.id("households"),
    name: v.string(),
    status: v.union(v.literal("active"), v.literal("archived")),
    createdByUserId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_household_status", ["householdId", "status"]),

  shoppingItems: defineTable({
    shoppingListId: v.id("shoppingLists"),
    name: v.string(),
    quantity: v.optional(v.string()),
    category: v.optional(v.string()),
    note: v.optional(v.string()),
    checked: v.boolean(),
    checkedByUserId: v.optional(v.id("users")),
    checkedAt: v.optional(v.number()),
    createdByUserId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_shopping_list", ["shoppingListId"])
    .index("by_shopping_list_checked", ["shoppingListId", "checked"]),

  expenses: defineTable({
    householdId: v.id("households"),
    title: v.string(),
    merchant: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    spentAt: v.number(),
    paidByUserId: v.optional(v.id("users")),
    category: v.string(),
    paymentMethod: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdByUserId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_household_spent_at", ["householdId", "spentAt"])
    .index("by_household_category", ["householdId", "category"]),

  expenseSplits: defineTable({
    expenseId: v.id("expenses"),
    userId: v.id("users"),
    amount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("settled"),
      v.literal("waived"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_expense", ["expenseId"])
    .index("by_user", ["userId"]),

  notes: defineTable({
    householdId: v.id("households"),
    title: v.string(),
    body: v.string(),
    noteType: v.union(
      v.literal("plain"),
      v.literal("checklist"),
      v.literal("decision"),
      v.literal("log"),
      v.literal("reference"),
    ),
    visibility: v.union(
      v.literal("household"),
      v.literal("adults"),
      v.literal("private"),
    ),
    createdByUserId: v.id("users"),
    updatedByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .searchIndex("search_body", {
      searchField: "body",
      filterFields: ["householdId"],
    })
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["householdId"],
    }),

  documents: defineTable({
    householdId: v.id("households"),
    title: v.string(),
    documentType: v.union(
      v.literal("receipt"),
      v.literal("invoice"),
      v.literal("contract"),
      v.literal("warranty"),
      v.literal("policy"),
      v.literal("identity"),
      v.literal("other"),
    ),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
    vendor: v.optional(v.string()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    issuedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    uploadedByUserId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_household_type", ["householdId", "documentType"])
    .index("by_household_expires", ["householdId", "expiresAt"]),

  documentLinks: defineTable({
    householdId: v.id("households"),
    documentId: v.id("documents"),
    linkedEntityType: v.union(
      v.literal("task"),
      v.literal("bill"),
      v.literal("expense"),
      v.literal("note"),
    ),
    linkedEntityId: v.string(),
    createdAt: v.number(),
  })
    .index("by_document", ["documentId"])
    .index("by_household", ["householdId"]),

  reminders: defineTable({
    householdId: v.id("households"),
    entityType: v.union(
      v.literal("task"),
      v.literal("bill"),
      v.literal("document"),
    ),
    entityId: v.string(),
    remindAt: v.number(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("sent"),
      v.literal("cancelled"),
    ),
    channel: v.union(v.literal("in_app"), v.literal("email")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_status_remind_at", ["status", "remindAt"]),

  activityEvents: defineTable({
    householdId: v.id("households"),
    actorUserId: v.optional(v.id("users")),
    entityType: v.string(),
    entityId: v.string(),
    action: v.string(),
    message: v.string(),
    createdAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_household_created_at", ["householdId", "createdAt"])
    .index("by_entity", ["entityType", "entityId"]),

  tags: defineTable({
    householdId: v.id("households"),
    name: v.string(),
    color: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_household", ["householdId"]),

  taggings: defineTable({
    householdId: v.id("households"),
    tagId: v.id("tags"),
    entityType: v.string(),
    entityId: v.string(),
    createdAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_tag", ["tagId"]),
})
