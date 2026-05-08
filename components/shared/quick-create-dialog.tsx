"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { TaskForm, type TaskFormSubmitValues } from "@/components/tasks/task-form";
import { BillForm, type BillFormSubmitValues } from "@/components/bills/bill-form";
import { EventForm, type EventFormSubmitValues } from "@/components/events/event-form";
import { ShoppingListForm, type ShoppingListFormSubmitValues } from "@/components/shopping/shopping-forms";
import { ExpenseForm, type ExpenseFormSubmitValues } from "@/components/accounting/expense-form";
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

type CreateMode =
  | "task"
  | "bill"
  | "event"
  | "shopping"
  | "expense"
  | "document"
  | "reminder"
  | null;

export function QuickCreateDialog() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CreateMode>(null);
  const { household } = useHousehold();
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
      recurrence: values.recurrence,
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

  async function handleCreateShoppingList(values: ShoppingListFormSubmitValues) {
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
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Quick create
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick create</DialogTitle>
          <DialogDescription>
            Choose what you want to create.
          </DialogDescription>
        </DialogHeader>

        {mode === null && (
          <div className="grid gap-2 sm:grid-cols-2">
            {QUICK_CREATE_ITEMS.map((item) => {
              const enabled =
                item.label === "Task" ||
                item.label === "Bill" ||
                item.label === "Event" ||
                item.label === "Shopping" ||
                item.label === "Expense" ||
                item.label === "Document" ||
                item.label === "Reminder";
              return (
                <button
                  key={item.label}
                  disabled={!enabled}
                  onClick={() =>
                    enabled && setMode(item.label.toLowerCase() as CreateMode)
                  }
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card/80 p-3 text-left text-sm transition-colors hover:border-foreground/14 hover:bg-muted/45 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-white/[0.04] dark:hover:border-white/[0.13] dark:hover:bg-white/[0.06]"
                >
                  <span className="flex size-9 items-center justify-center rounded-2xl bg-muted dark:bg-white/[0.06]">
                    <item.icon className="size-4" />
                  </span>
                  <span>
                    <span className="block font-semibold text-foreground/88">{item.label}</span>
                    <span className="text-xs text-foreground/42">
                      {enabled ? "Click to create" : "Available in a later milestone"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {mode === "task" && members && (
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Create task</h3>
              <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
                Back
              </Button>
            </div>
            <TaskForm
              members={members}
              submitLabel="Create task"
              onSubmit={handleCreateTask}
            />
          </div>
        )}

        {mode === "bill" && members && (
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Add bill</h3>
              <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
                Back
              </Button>
            </div>
            <BillForm
              members={members}
              submitLabel="Add bill"
              onSubmit={handleCreateBill}
            />
          </div>
        )}

        {mode === "event" && members && (
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Add event</h3>
              <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
                Back
              </Button>
            </div>
            <EventForm
              members={members}
              submitLabel="Add event"
              onSubmit={handleCreateEvent}
            />
          </div>
        )}

        {mode === "shopping" && (
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">New shopping list</h3>
              <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
                Back
              </Button>
            </div>
            <ShoppingListForm
              submitLabel="Create list"
              onSubmit={handleCreateShoppingList}
            />
          </div>
        )}

        {mode === "expense" && members && (
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Log expense</h3>
              <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
                Back
              </Button>
            </div>
            <ExpenseForm
              members={members}
              submitLabel="Log expense"
              onSubmit={handleCreateExpense}
            />
          </div>
        )}

        {mode === "reminder" && members && (
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Create reminder</h3>
              <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
                Back
              </Button>
            </div>
            <ReminderForm
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
