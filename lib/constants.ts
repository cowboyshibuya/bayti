import {
  Bell,
  CalendarDays,
  CheckSquare,
  FileText,
  Home,
  Inbox,
  NotebookText,
  ReceiptText,
  Settings,
  ShoppingCart,
  Sparkles,
  WalletCards,
} from "lucide-react";

export const HOUSEHOLD_ROLES = ["admin", "adult", "child", "viewer"] as const;
export type HouseholdRole = (typeof HOUSEHOLD_ROLES)[number];

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

export const BILL_STATUSES = [
  "upcoming",
  "due_soon",
  "paid",
  "overdue",
  "cancelled",
] as const;

export const EVENT_STATUSES = [
  "upcoming",
  "ongoing",
  "completed",
  "cancelled",
] as const;

export const SHOPPING_LIST_STATUSES = [
  "active",
  "archived",
] as const;

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

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const DOCUMENT_TYPES = [
  "receipt",
  "invoice",
  "contract",
  "warranty",
  "policy",
  "identity",
  "other",
] as const;

export const DEFAULT_CURRENCY = "EUR";

export const APP_NAVIGATION = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Stella", href: "/stella", icon: Sparkles },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Bills", href: "/bills", icon: ReceiptText },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Shopping", href: "/shopping", icon: ShoppingCart },
  { label: "Accounting", href: "/accounting", icon: WalletCards },
  { label: "Notes", href: "/notes", icon: NotebookText },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

export const QUICK_CREATE_ITEMS = [
  { label: "Task", icon: CheckSquare },
  { label: "Bill", icon: ReceiptText },
  { label: "Event", icon: CalendarDays },
  { label: "Shopping", icon: ShoppingCart },
  { label: "Expense", icon: WalletCards },
  { label: "Note", icon: NotebookText },
  { label: "Document", icon: FileText },
  { label: "Reminder", icon: Bell },
] as const;
