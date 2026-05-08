import { v } from "convex/values";

export const householdNameValidator = v.string();
export const inviteCodeValidator = v.string();
export const householdRoleValidator = v.union(
  v.literal("admin"),
  v.literal("adult"),
  v.literal("child"),
  v.literal("viewer"),
);

export const taskStatusValidator = v.union(
  v.literal("inbox"),
  v.literal("todo"),
  v.literal("in_progress"),
  v.literal("waiting"),
  v.literal("done"),
  v.literal("cancelled"),
);

export const taskPriorityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("urgent"),
);

export const taskTypeValidator = v.union(
  v.literal("one_off"),
  v.literal("chore"),
  v.literal("bill"),
  v.literal("errand"),
  v.literal("maintenance"),
  v.literal("admin"),
  v.literal("decision"),
  v.literal("follow_up"),
);

export const recurrenceFrequencyValidator = v.union(
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("monthly"),
  v.literal("yearly"),
);

export const billStatusValidator = v.union(
  v.literal("upcoming"),
  v.literal("due_soon"),
  v.literal("paid"),
  v.literal("overdue"),
  v.literal("cancelled"),
);

export const billPriorityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("urgent"),
);

export const eventStatusValidator = v.union(
  v.literal("upcoming"),
  v.literal("ongoing"),
  v.literal("completed"),
  v.literal("cancelled"),
);

export const shoppingListStatusValidator = v.union(
  v.literal("active"),
  v.literal("archived"),
);

export const reminderEntityTypeValidator = v.union(
  v.literal("task"),
  v.literal("bill"),
  v.literal("event"),
  v.literal("document"),
  v.literal("manual"),
);

export const reminderStatusValidator = v.union(
  v.literal("scheduled"),
  v.literal("sent"),
  v.literal("dismissed"),
  v.literal("cancelled"),
);

export const expenseCategoryValidator = v.union(
  v.literal("Groceries"),
  v.literal("Utilities"),
  v.literal("Rent/Mortgage"),
  v.literal("Transport"),
  v.literal("Education"),
  v.literal("Health"),
  v.literal("Household"),
  v.literal("Eating Out"),
  v.literal("Subscriptions"),
  v.literal("Repairs"),
  v.literal("Insurance"),
  v.literal("Travel"),
  v.literal("Gifts"),
  v.literal("Miscellaneous"),
);

export const documentTypeValidator = v.union(
  v.literal("receipt"),
  v.literal("invoice"),
  v.literal("contract"),
  v.literal("warranty"),
  v.literal("policy"),
  v.literal("identity"),
  v.literal("other"),
);
