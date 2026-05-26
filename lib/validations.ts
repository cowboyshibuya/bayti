import { z } from "zod";

import {
  BILL_STATUSES,
  EVENT_STATUSES,
  HOUSEHOLD_ROLES,
  RECURRENCE_FREQUENCIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
} from "./constants";

export const householdOnboardingSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const inviteCodeSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .toUpperCase()
    .transform((value) => value.replaceAll("-", ""))
    .pipe(z.string().length(8)),
});

export const householdMemberRoleSchema = z.object({
  role: z.enum(HOUSEHOLD_ROLES),
});

export const taskFormSchema = z.object({
  title: z.string().trim().min(1, "Task title is required.").max(140),
  description: z.string().trim().optional(),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  taskType: z.enum(TASK_TYPES),
  ownerUserId: z.string().optional(),
  dueDate: z.string().optional(),
  recurring: z.boolean(),
  frequency: z.enum(RECURRENCE_FREQUENCIES).optional(),
  interval: z.coerce.number().int().min(1).max(24).optional(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const billFormSchema = z.object({
  title: z.string().trim().min(1, "Bill title is required.").max(140),
  description: z.string().trim().optional(),
  provider: z.string().trim().optional(),
  amountExpected: z.coerce.number().min(0).optional(),
  currency: z.string().min(3).max(3).default("EUR"),
  dueDate: z.string().optional(),
  status: z.enum(BILL_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  ownerUserId: z.string().optional(),
  autopay: z.boolean().default(false),
  recurring: z.boolean(),
  frequency: z.enum(RECURRENCE_FREQUENCIES).optional(),
  interval: z.coerce.number().int().min(1).max(24).optional(),
});

export type BillFormValues = z.infer<typeof billFormSchema>;

export const eventFormSchema = z.object({
  title: z.string().trim().min(1, "Event title is required.").max(140),
  description: z.string().trim().optional(),
  note: z.string().trim().optional(),
  date: z.string().min(1, "Date is required."),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  isAllDay: z.boolean().default(false),
  location: z.string().trim().optional(),
  status: z.enum(EVENT_STATUSES),
  ownerUserId: z.string().optional(),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

export const shoppingListFormSchema = z.object({
  name: z.string().trim().min(1, "List name is required.").max(140),
});

export type ShoppingListFormValues = z.infer<typeof shoppingListFormSchema>;

export const shoppingItemFormSchema = z.object({
  name: z.string().trim().min(1, "Item name is required.").max(140),
  quantity: z.string().trim().optional(),
  category: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export type ShoppingItemFormValues = z.infer<typeof shoppingItemFormSchema>;
