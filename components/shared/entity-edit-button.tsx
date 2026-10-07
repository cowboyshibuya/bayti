"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useMutation, useQuery } from "convex/react";
import type { Doc } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useHousehold } from "@/lib/household-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExpenseForm } from "@/components/accounting/expense-form";
import { BillForm } from "@/components/bills/bill-form";
import { TaskForm } from "@/components/tasks/task-form";
import { EventForm } from "@/components/events/event-form";
import {
  ShoppingListForm,
  ShoppingItemEditForm,
} from "@/components/shopping/shopping-forms";

type Entity =
  | { kind: "expense"; value: Doc<"expenses"> }
  | { kind: "bill"; value: Doc<"bills"> }
  | { kind: "task"; value: Doc<"tasks"> }
  | { kind: "event"; value: Doc<"events"> }
  | { kind: "shoppingList"; value: Doc<"shoppingLists"> }
  | { kind: "shoppingItem"; value: Doc<"shoppingItems"> };

export function EntityEditButton({
  entity,
  children,
  className = "min-w-0 flex-1 text-left",
  href,
  stretch = false,
}: {
  entity: Entity;
  children: ReactNode;
  className?: string;
  href?: string;
  stretch?: boolean;
}) {
  const actionClassName = `${className} ${stretch ? "after:absolute after:inset-0 after:rounded-xl after:content-['']" : ""}`;
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const removeExpense = useMutation(api.expenses.remove);
  const removeBill = useMutation(api.bills.remove);
  const removeTask = useMutation(api.tasks.remove);
  const removeEvent = useMutation(api.events.remove);
  const removeList = useMutation(api.shopping.deleteList);
  const removeItem = useMutation(api.shopping.deleteItem);
  const { household, membership } = useHousehold();
  const role = membership?.role;
  const canEdit =
    entity.kind === "expense" || entity.kind === "bill"
      ? ["admin", "adult"].includes(role ?? "")
      : ["admin", "adult", "child"].includes(role ?? "");
  const canDelete =
    ["admin", "adult"].includes(role ?? "") ||
    (entity.kind === "shoppingItem" && role === "child") ||
    ("createdByUserId" in entity.value &&
      entity.value.createdByUserId === membership?.userId);
  async function handleDelete() {
    if (!household || deletePending) return;
    setDeletePending(true);
    setDeleteError(null);
    const householdId = household._id;
    try {
      switch (entity.kind) {
        case "expense":
          await removeExpense({ householdId, expenseId: entity.value._id });
          break;
        case "bill":
          await removeBill({ householdId, billId: entity.value._id });
          break;
        case "task":
          await removeTask({ householdId, taskId: entity.value._id });
          break;
        case "event":
          await removeEvent({ householdId, eventId: entity.value._id });
          break;
        case "shoppingList":
          await removeList({ householdId, listId: entity.value._id });
          break;
        case "shoppingItem":
          await removeItem({
            householdId,
            listId: entity.value.shoppingListId,
            itemId: entity.value._id,
          });
          break;
      }
      setDeleteOpen(false);
      setOpen(false);
      toast.success("Deleted successfully");
    } catch (caught) {
      setDeleteError(
        caught instanceof Error
          ? caught.message
          : "Could not delete. Please try again.",
      );
    } finally {
      setDeletePending(false);
    }
  }
  if (!canEdit)
    return href ? (
      <Link href={href} className={actionClassName}>
        {children}
      </Link>
    ) : (
      <div className={className}>{children}</div>
    );
  return (
    <>
      <Dialog
        key={household?._id}
        open={open}
        onOpenChange={setOpen}
        onDelete={
          canDelete
            ? () => {
                setDeleteError(null);
                setDeleteOpen(true);
              }
            : undefined
        }
      >
        <DialogTrigger asChild>
          <button
            type="button"
            className={`${actionClassName} rounded-lg focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4`}
            aria-label={`Edit ${"title" in entity.value ? entity.value.title : entity.value.name}`}
          >
            {children}
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Edit{" "}
              {entity.kind === "shoppingList"
                ? "shopping list"
                : entity.kind === "shoppingItem"
                  ? "shopping item"
                  : entity.kind}
            </DialogTitle>
            <DialogDescription>
              Update the details, then save your changes.
            </DialogDescription>
          </DialogHeader>
          {open && <Editor key={entity.value._id} entity={entity} />}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this item?"
        description={`Permanently delete "${"title" in entity.value ? entity.value.title : entity.value.name}"${entity.kind === "shoppingList" ? " and all its shopping items" : ""}? This cannot be undone.`}
        actionLabel="Delete"
        pending={deletePending}
        error={deleteError}
        onConfirm={handleDelete}
      />
    </>
  );
}

function Editor({ entity }: { entity: Entity }) {
  const { household } = useHousehold();
  const householdId = household!._id;
  const members = useQuery(api.members.listAssignable, { householdId });
  const billDetails = useQuery(
    api.bills.getDetails,
    entity.kind === "bill" ? { householdId, billId: entity.value._id } : "skip",
  );
  const taskDetails = useQuery(
    api.tasks.getDetails,
    entity.kind === "task" ? { householdId, taskId: entity.value._id } : "skip",
  );
  const expense = useMutation(api.expenses.update);
  const bill = useMutation(api.bills.update);
  const task = useMutation(api.tasks.update);
  const event = useMutation(api.events.update);
  const list = useMutation(api.shopping.updateList);
  const item = useMutation(api.shopping.updateItem);
  if (
    !members ||
    (entity.kind === "bill" && !billDetails) ||
    (entity.kind === "task" && !taskDetails)
  )
    return (
      <p role="status" className="py-8 text-muted-foreground">
        Loading current details…
      </p>
    );
  switch (entity.kind) {
    case "expense":
      return (
        <ExpenseForm
          members={members}
          initialExpense={entity.value}
          submitLabel="Save changes"
          onSubmit={async (v) => {
            await expense({
              ...v,
              householdId,
              expenseId: entity.value._id,
              merchant: v.merchant ?? "",
              notes: v.notes ?? "",
              paymentMethod: v.paymentMethod ?? "",
              paidByUserId: v.paidByUserId ?? null,
            });
          }}
        />
      );
    case "bill":
      return (
        <BillForm
          members={members}
          initialBill={billDetails!.bill}
          initialRecurrence={billDetails!.recurrence}
          submitLabel="Save changes"
          onSubmit={async (v) => {
            await bill({
              ...v,
              householdId,
              billId: entity.value._id,
              amountExpected: v.amountExpected ?? null,
              description: v.description ?? "",
              provider: v.provider ?? "",
              dueAt: v.dueAt ?? null,
              ownerUserId: v.ownerUserId ?? null,
            });
          }}
        />
      );
    case "task":
      return (
        <TaskForm
          members={members}
          initialTask={taskDetails!.task}
          initialRecurrence={taskDetails!.recurrence}
          submitLabel="Save changes"
          onSubmit={async (v) => {
            await task({
              householdId,
              taskId: entity.value._id,
              status: v.status,
              recurrence: v.recurrence,
              title: v.title,
              description: v.description ?? "",
              priority: v.priority,
              taskType: v.taskType,
              dueAt: v.dueAt ?? null,
              ownerUserId: v.ownerUserId ?? null,
            });
          }}
        />
      );
    case "event":
      return (
        <EventForm
          members={members}
          initialEvent={entity.value}
          submitLabel="Save changes"
          onSubmit={async (v) => {
            await event({
              ...v,
              householdId,
              eventId: entity.value._id,
              description: v.description ?? "",
              note: v.note ?? "",
              location: v.location ?? "",
              endsAt: v.endsAt ?? null,
              ownerUserId: v.ownerUserId ?? null,
            });
          }}
        />
      );
    case "shoppingList":
      return (
        <ShoppingListForm
          initialName={entity.value.name}
          submitLabel="Save changes"
          onSubmit={async (v) => {
            await list({ householdId, listId: entity.value._id, ...v });
          }}
        />
      );
    case "shoppingItem":
      return (
        <ShoppingItemEditForm
          initialItem={entity.value}
          onSubmit={async (v) => {
            await item({
              householdId,
              listId: entity.value.shoppingListId,
              itemId: entity.value._id,
              ...v,
            });
          }}
        />
      );
  }
}
