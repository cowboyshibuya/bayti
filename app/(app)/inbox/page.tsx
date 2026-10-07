"use client";

import {
  EntityCollection,
  type ListControls,
} from "@/components/shared/entity-collection";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Bell, Inbox, Plus } from "lucide-react";

import { api } from "@/convex/_generated/api";
import {
  InboxItemCard,
  type InboxItem,
} from "@/components/inbox/inbox-item-card";
import {
  ReminderForm,
  type ReminderFormSubmitValues,
} from "@/components/reminders/reminder-form";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useHousehold } from "@/lib/household-context";
import { cn } from "@/lib/utils";

const inboxViews = [
  { value: "all", label: "All" },
  { value: "mine", label: "Mine" },
  { value: "overdue", label: "Overdue" },
  { value: "due_soon", label: "Due soon" },
  { value: "today", label: "Today" },
  { value: "reminders", label: "Reminders" },
] as const;

type InboxView = (typeof inboxViews)[number]["value"];

export default function InboxPage() {
  const [controls, setControls] = useState<ListControls | undefined>();
  const [view, setView] = useState<InboxView>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InboxItem | null>(null);
  const [reminderToDelete, setReminderToDelete] = useState<InboxItem | null>(
    null,
  );
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { household, membership } = useHousehold();
  const canEdit =
    membership && ["admin", "adult", "child"].includes(membership.role);
  const householdId = household?._id;
  const members = useQuery(
    api.members.listAssignable,
    householdId ? { householdId } : "skip",
  );
  const items = useQuery(
    api.inbox.list,
    householdId
      ? { householdId, view, windowDays: 7, limit: 60, controls }
      : "skip",
  );
  const createReminder = useMutation(api.reminders.create);
  const updateReminder = useMutation(api.reminders.update);
  const dismissReminder = useMutation(api.reminders.dismiss);
  const cancelReminder = useMutation(api.reminders.cancel);
  const removeReminder = useMutation(api.reminders.remove);
  const markTaskDone = useMutation(api.tasks.markDone);
  const markBillPaid = useMutation(api.bills.markPaid);

  if (!householdId || members === undefined) {
    return <LoadingState label="Loading inbox" />;
  }

  const currentHouseholdId = householdId;

  async function handleCreateReminder(values: ReminderFormSubmitValues) {
    await createReminder({
      householdId: currentHouseholdId,
      title: values.title,
      note: values.note,
      remindAt: values.remindAt,
      targetUserId: values.targetUserId,
    });
    setCreateOpen(false);
  }

  async function handleUpdateReminder(values: ReminderFormSubmitValues) {
    if (!editingItem?.reminderId) {
      return;
    }

    await updateReminder({
      householdId: currentHouseholdId,
      reminderId: editingItem.reminderId,
      title: values.title,
      note: values.note ?? "",
      remindAt: values.remindAt,
      targetUserId: values.targetUserId ?? null,
    });
    setEditingItem(null);
  }

  async function handleDeleteReminder() {
    if (!reminderToDelete?.reminderId) return;

    setDeletePending(true);
    setDeleteError(null);

    try {
      await removeReminder({
        householdId: currentHouseholdId,
        reminderId: reminderToDelete.reminderId,
      });
      if (editingItem?.reminderId === reminderToDelete.reminderId)
        setEditingItem(null);
      setReminderToDelete(null);
    } catch (caught) {
      setDeleteError(
        caught instanceof Error ? caught.message : "Could not delete reminder.",
      );
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{household?.name}</p>
          <h1 className="text-2xl font-semibold">Inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tasks, bills, events, documents, and reminders that need attention.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Reminder
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create reminder</DialogTitle>
              <DialogDescription>
                Add an in-app reminder for yourself or the whole household.
              </DialogDescription>
            </DialogHeader>
            <ReminderForm
              members={members}
              submitLabel="Create reminder"
              onSubmit={handleCreateReminder}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {inboxViews.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={view === item.value ? "secondary" : "outline"}
            onClick={() => setView(item.value)}
            className={cn(view === item.value && "font-semibold")}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="mt-6 grid gap-3">
        <EntityCollection
          items={(items ?? []).map((item) => ({
            ...item,
            _id: item.id,
            ownerUserId: item.ownerUserId ?? undefined,
            targetUserId: item.targetUserId ?? undefined,
          }))}
          date={(item) => item.dueAt}
          dateLabel="Reminder / due date"
          onControlsChange={setControls}
        >
          {(visible) =>
            items === undefined ? (
              <LoadingState label="Loading inbox" />
            ) : visible.length === 0 ? (
              <EmptyState
                icon={view === "reminders" ? Bell : Inbox}
                title={view === "reminders" ? "No reminders" : "Inbox is clear"}
                description={
                  view === "reminders"
                    ? "Create a reminder to keep a household follow-up visible."
                    : "Due tasks, bills, events, document expiries, and reminders will appear here."
                }
              />
            ) : (
              visible.map((item) => (
                <InboxItemCard
                  key={item.id}
                  item={{
                    ...item,
                    ownerUserId: item.ownerUserId ?? null,
                    targetUserId: item.targetUserId ?? null,
                  }}
                  onMarkDone={(taskId) =>
                    void markTaskDone({ householdId, taskId })
                  }
                  onMarkPaid={(billId) =>
                    void markBillPaid({ householdId, billId })
                  }
                  onDismissReminder={(reminderId) =>
                    void dismissReminder({ householdId, reminderId })
                  }
                  onCancelReminder={(reminderId) =>
                    void cancelReminder({ householdId, reminderId })
                  }
                  onDeleteReminder={(item) => {
                    setDeleteError(null);
                    setReminderToDelete(item);
                  }}
                  onEditReminder={canEdit ? setEditingItem : undefined}
                />
              ))
            )
          }
        </EntityCollection>
      </div>

      <Dialog
        open={Boolean(editingItem)}
        onDelete={() => setReminderToDelete(editingItem)}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit reminder</DialogTitle>
            <DialogDescription>
              Update the reminder details or who it is for.
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <ReminderForm
              members={members}
              submitLabel="Save reminder"
              initialReminder={{
                title: editingItem.title,
                note: editingItem.description ?? undefined,
                remindAt: editingItem.dueAt,
                targetUserId: editingItem.targetUserId ?? undefined,
              }}
              onSubmit={handleUpdateReminder}
            />
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={Boolean(reminderToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setReminderToDelete(null);
            setDeleteError(null);
          }
        }}
        title="Delete reminder?"
        description={
          reminderToDelete
            ? `This permanently deletes "${reminderToDelete.title}". This cannot be undone.`
            : "This permanently deletes the reminder."
        }
        actionLabel="Delete reminder"
        pending={deletePending}
        error={deleteError}
        onConfirm={handleDeleteReminder}
      />
    </div>
  );
}
