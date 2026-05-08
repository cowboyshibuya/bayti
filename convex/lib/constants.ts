export const HOUSEHOLD_ROLES = ["admin", "adult", "child", "viewer"] as const;

export type HouseholdRole = (typeof HOUSEHOLD_ROLES)[number];

export const WRITE_ROLES = ["admin", "adult", "child"] as const;
export const ADULT_ROLES = ["admin", "adult"] as const;
export const ADMIN_ROLES = ["admin"] as const;

export const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_LENGTH = 8;

export const ACTIVITY_ACTIONS = {
  householdCreated: "household.created",
  householdJoined: "household.joined",
  memberUpdated: "member.updated",
  taskCreated: "task.created",
  taskUpdated: "task.updated",
  taskStatusChanged: "task.status_changed",
  taskCompleted: "task.completed",
  taskCancelled: "task.cancelled",
  taskDeleted: "task.deleted",
  taskGenerated: "task.generated",
  billCreated: "bill.created",
  billUpdated: "bill.updated",
  billStatusChanged: "bill.status_changed",
  billPaid: "bill.paid",
  billCancelled: "bill.cancelled",
  billDeleted: "bill.deleted",
  expenseCreated: "expense.created",
  expenseUpdated: "expense.updated",
  expenseDeleted: "expense.deleted",
  eventCreated: "event.created",
  eventUpdated: "event.updated",
  eventCancelled: "event.cancelled",
  eventDeleted: "event.deleted",
  shoppingListCreated: "shopping_list.created",
  shoppingListUpdated: "shopping_list.updated",
  shoppingListDeleted: "shopping_list.deleted",
  shoppingItemAdded: "shopping_item.added",
  shoppingItemToggled: "shopping_item.toggled",
} as const;

export const EXPENSE_CATEGORIES = [
  "Groceries",
  "Utilities",
  "Rent/Mortgage",
  "Transport",
  "Education",
  "Health",
  "Household",
  "Eating Out",
  "Subscriptions",
  "Repairs",
  "Insurance",
  "Travel",
  "Gifts",
  "Miscellaneous",
] as const;

export const ENTITY_TYPES = {
  household: "household",
  member: "member",
  task: "task",
  bill: "bill",
  expense: "expense",
  event: "event",
  shoppingList: "shopping_list",
} as const;

export const TASK_STATUSES = [
  "inbox",
  "todo",
  "in_progress",
  "waiting",
  "done",
  "cancelled",
] as const;

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export const TASK_TYPES = [
  "one_off",
  "chore",
  "bill",
  "errand",
  "maintenance",
  "admin",
  "decision",
  "follow_up",
] as const;

export const RECURRENCE_FREQUENCIES = [
  "daily",
  "weekly",
  "monthly",
  "yearly",
] as const;
