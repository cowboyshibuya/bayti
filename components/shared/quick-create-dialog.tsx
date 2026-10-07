"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { formatDate } from "@/lib/dates";
import { Plus } from "lucide-react";

import { api } from "@/convex/_generated/api";
import {
  TaskForm,
  type TaskFormSubmitValues,
} from "@/components/tasks/task-form";
import {
  BillForm,
  type BillFormSubmitValues,
} from "@/components/bills/bill-form";
import {
  EventForm,
  type EventFormSubmitValues,
} from "@/components/events/event-form";
import {
  ShoppingListForm,
  type ShoppingListFormSubmitValues,
} from "@/components/shopping/shopping-forms";
import {
  ExpenseForm,
  type ExpenseFormSubmitValues,
} from "@/components/accounting/expense-form";
import { Button } from "@/components/ui/button";
import { useHousehold } from "@/lib/household-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QUICK_CREATE_ITEMS } from "@/lib/constants";
import {
  ReminderForm,
  type ReminderFormSubmitValues,
} from "@/components/reminders/reminder-form";

const CALENDAR_CREATE_LABELS = [
  "Event",
  "Expense",
  "Bill",
  "Task",
  "Reminder",
  "Shopping",
];

type CreateMode =
  | "task"
  | "bill"
  | "event"
  | "shopping"
  | "expense"
  | "document"
  | "reminder"
  | null;

export function QuickCreateDialog({
  iconOnly = false,
  open: controlledOpen,
  onOpenChange,
  date,
  children,
  showTrigger = true,
}: {
  iconOnly?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  date?: Date;
  children?: ReactNode;
  showTrigger?: boolean;
}) {
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const focusedMode = useRef<CreateMode>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  function setOpen(next: boolean) {
    setInternalOpen(next);
    onOpenChange?.(next);
    if (!next) setMode(null);
  }
  const [mode, setMode] = useState<CreateMode>(null);
  const { household, membership } = useHousehold();
  const householdId = household?._id;
  const members = useQuery(
    api.members.listAssignable,
    householdId ? { householdId } : "skip",
  );
  const createTask = useMutation(api.tasks.create);
  const createBill = useMutation(api.bills.create);
  const createEvent = useMutation(api.events.create);
  const createShoppingList = useMutation(api.shopping.createList);
  const createExpense = useMutation(api.expenses.create);
  const createReminder = useMutation(api.reminders.create);

  useEffect(() => {
    if (!mode) {
      const returning = focusedMode.current !== null;
      focusedMode.current = null;
      if (returning)
        contentRef.current
          ?.querySelector<HTMLButtonElement>("[data-quick-create-action]")
          ?.focus();
      return;
    }
    if (focusedMode.current === mode) return;
    const input = contentRef.current?.querySelector<HTMLInputElement>(
      "form input:not([type=hidden])",
    );
    if (input) {
      input.focus();
      focusedMode.current = mode;
    }
  }, [mode, members]);

  async function handleCreateTask(values: TaskFormSubmitValues) {
    if (!householdId) return;
    await createTask({
      householdId,
      title: values.title,
      description: values.description,
      status: values.status,
      priority: values.priority,
      taskType: values.taskType,
      ownerUserId: values.ownerUserId,
      dueAt: values.dueAt,
      recurrence: values.recurrence ?? undefined,
    });
    setMode(null);
    setOpen(false);
  }

  async function handleCreateBill(values: BillFormSubmitValues) {
    if (!householdId) return;
    await createBill({
      householdId,
      title: values.title,
      description: values.description,
      provider: values.provider,
      amountExpected: values.amountExpected,
      paidAt: values.paidAt,
      currency: values.currency,
      dueAt: values.dueAt,
      status: values.status,
      priority: values.priority,
      ownerUserId: values.ownerUserId,
      autopay: values.autopay,
      recurrence: values.recurrence ?? undefined,
    });
    setMode(null);
    setOpen(false);
  }

  async function handleCreateEvent(values: EventFormSubmitValues) {
    if (!householdId) return;
    await createEvent({
      householdId,
      title: values.title,
      description: values.description,
      note: values.note,
      startsAt: values.startsAt,
      endsAt: values.endsAt,
      isAllDay: values.isAllDay,
      location: values.location,
      status: values.status,
      ownerUserId: values.ownerUserId,
    });
    setMode(null);
    setOpen(false);
  }

  async function handleCreateShoppingList(
    values: ShoppingListFormSubmitValues,
  ) {
    if (!householdId) return;
    await createShoppingList({
      householdId,
      name: values.name,
    });
    setMode(null);
    setOpen(false);
  }

  async function handleCreateExpense(values: ExpenseFormSubmitValues) {
    if (!householdId) return;
    await createExpense({
      householdId,
      title: values.title,
      merchant: values.merchant,
      amount: values.amount,
      currency: values.currency,
      spentAt: values.spentAt,
      category: values.category,
      paymentMethod: values.paymentMethod,
      notes: values.notes,
      paidByUserId: values.paidByUserId,
    });
    setMode(null);
    setOpen(false);
  }

  async function handleCreateReminder(values: ReminderFormSubmitValues) {
    if (!householdId) return;
    await createReminder({
      householdId,
      title: values.title,
      note: values.note,
      remindAt: values.remindAt,
      targetUserId: values.targetUserId,
    });
    setMode(null);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button
            size={iconOnly ? "icon" : "default"}
            className={iconOnly ? "size-10" : undefined}
            aria-label={iconOnly ? "Quick actions" : undefined}
            title={iconOnly ? "Quick actions" : undefined}
          >
            <Plus className="size-4" />
            {!iconOnly && "Quick create"}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        ref={contentRef}
        onOpenAutoFocus={() => {
          openerRef.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
        }}
        onCloseAutoFocus={(event) => {
          if (date && openerRef.current?.isConnected) {
            event.preventDefault();
            openerRef.current.focus();
          }
        }}
      >
        <DialogHeader onBack={mode ? () => setMode(null) : undefined}>
          <DialogTitle>
            {mode
              ? `${mode === "expense" ? "Log" : "Create"} ${mode === "shopping" ? "shopping list" : mode}`
              : date
                ? formatDate(date.getTime())
                : "Quick actions"}
          </DialogTitle>
          <DialogDescription>
            {mode
              ? "Enter the details, then save."
              : date
                ? "What would you like to add to this day?"
                : "Create something or ask Stella for help."}
          </DialogDescription>
        </DialogHeader>

        {mode === null && (
          <div className="grid gap-2 sm:grid-cols-2">
            {QUICK_CREATE_ITEMS.filter(
              (item) => !date || CALENDAR_CREATE_LABELS.includes(item.label),
            )
              .sort((a, b) =>
                date
                  ? CALENDAR_CREATE_LABELS.indexOf(a.label) -
                    CALENDAR_CREATE_LABELS.indexOf(b.label)
                  : 0,
              )
              .map((item) => {
                const allowed =
                  item.label === "Ask Stella" ||
                  (["admin", "adult", "child"].includes(
                    membership?.role ?? "",
                  ) &&
                    (!["Expense", "Bill"].includes(item.label) ||
                      ["admin", "adult"].includes(membership?.role ?? "")));
                const enabled =
                  allowed &&
                  (item.label === "Task" ||
                    item.label === "Bill" ||
                    item.label === "Event" ||
                    item.label === "Shopping" ||
                    item.label === "Expense" ||
                    item.label === "Document" ||
                    item.label === "Reminder" ||
                    item.label === "Ask Stella");
                return (
                  <button
                    type="button"
                    data-quick-create-action
                    key={item.label}
                    disabled={!enabled}
                    onClick={() => {
                      if (item.label === "Ask Stella") {
                        setOpen(false);
                        router.push("/stella");
                      } else if (enabled) {
                        setMode(item.label.toLowerCase() as CreateMode);
                      }
                    }}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card/80 p-3 text-left text-sm transition-colors hover:border-foreground/14 hover:bg-muted/45 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-white/[0.04] dark:hover:border-white/[0.13] dark:hover:bg-white/[0.06]"
                  >
                    <span className="flex size-9 items-center justify-center rounded-2xl bg-muted dark:bg-white/[0.06]">
                      <item.icon className="size-4" />
                    </span>
                    <span>
                      <span className="block font-semibold text-foreground/88">
                        {item.label === "Shopping"
                          ? "Shopping list"
                          : item.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.label === "Ask Stella"
                          ? "Start a conversation"
                          : enabled
                            ? date
                              ? item.label === "Shopping"
                                ? "Create a new list"
                                : "Create for this day"
                              : "Click to create"
                            : !allowed
                              ? "Editing permission required"
                              : "Available in a later milestone"}
                      </span>
                    </span>
                  </button>
                );
              })}
          </div>
        )}
        {mode === null && children}
        {mode !== null && mode !== "shopping" && !members && (
          <p role="status">Loading form…</p>
        )}

        {mode === "task" && members && (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <TaskForm
              defaultDate={date?.getTime()}
              members={members}
              submitLabel="Create task"
              onSubmit={handleCreateTask}
            />
          </div>
        )}

        {mode === "bill" && members && (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <BillForm
              defaultDate={date?.getTime()}
              members={members}
              submitLabel="Add bill"
              onSubmit={handleCreateBill}
            />
          </div>
        )}

        {mode === "event" && members && (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <EventForm
              defaultDate={date?.getTime()}
              members={members}
              submitLabel="Add event"
              onSubmit={handleCreateEvent}
            />
          </div>
        )}

        {mode === "shopping" && (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <ShoppingListForm
              submitLabel="Create list"
              onSubmit={handleCreateShoppingList}
            />
          </div>
        )}

        {mode === "expense" && members && (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <ExpenseForm
              defaultDate={date?.getTime()}
              members={members}
              submitLabel="Log expense"
              onSubmit={handleCreateExpense}
            />
          </div>
        )}

        {mode === "reminder" && members && (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <ReminderForm
              defaultDate={
                date
                  ? new Date(
                      date.getFullYear(),
                      date.getMonth(),
                      date.getDate(),
                      9,
                    ).getTime()
                  : undefined
              }
              members={members}
              submitLabel="Create reminder"
              onSubmit={handleCreateReminder}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
