"use client";

import { use, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CalendarClock, Repeat, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { RecentActivityPanel } from "@/components/dashboard/recent-activity-panel";
import { LoadingState } from "@/components/shared/loading-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  TaskForm,
  type TaskFormSubmitValues,
} from "@/components/tasks/task-form";
import { TaskPriorityBadge } from "@/components/tasks/task-priority-badge";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { BackButton } from "@/components/shared/back-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_STATUSES } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/dates";
import { toTitleLabel } from "@/lib/formatters";
import { useHousehold } from "@/lib/household-context";

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { household } = useHousehold();
  const householdId = household?._id;
  const taskDetails = useQuery(
    api.tasks.getDetails,
    householdId ? { householdId, taskId: id as Id<"tasks"> } : "skip",
  );
  const task = taskDetails?.task;
  const members = useQuery(
    api.members.listAssignable,
    householdId ? { householdId } : "skip",
  );
  const activity = useQuery(
    api.activity.listForEntity,
    householdId ? { householdId, entityType: "task", entityId: id } : "skip",
  );
  const updateTask = useMutation(api.tasks.update);
  const updateStatus = useMutation(api.tasks.updateStatus);
  const markDone = useMutation(api.tasks.markDone);
  const cancelTask = useMutation(api.tasks.cancel);
  const removeTask = useMutation(api.tasks.remove);
  const generateRecurringInstances = useMutation(
    api.tasks.generateRecurringInstances,
  );
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!householdId || task === undefined || members === undefined) {
    return <LoadingState label="Loading task" />;
  }

  async function handleUpdate(values: TaskFormSubmitValues) {
    if (!householdId || !task) {
      return;
    }

    await updateTask({
      householdId,
      taskId: task._id,
      status: values.status,
      recurrence: values.recurrence,
      title: values.title,
      description: values.description ?? "",
      priority: values.priority,
      taskType: values.taskType,
      ownerUserId: values.ownerUserId ?? null,
      dueAt: values.dueAt ?? null,
    });
    setEditOpen(false);
  }

  async function handleStatusChange(status: Doc<"tasks">["status"]) {
    if (!householdId || !task) {
      return;
    }

    await updateStatus({ householdId, taskId: task._id, status });
  }

  async function handleDelete() {
    if (!householdId || !task) return;

    setDeletePending(true);
    setDeleteError(null);

    try {
      await removeTask({ householdId, taskId: task._id });
      setDeleteOpen(false);
      router.push("/tasks");
    } catch (caught) {
      setDeleteError(
        caught instanceof Error ? caught.message : "Could not delete task.",
      );
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <TaskStatusBadge status={task.status} />
              <TaskPriorityBadge priority={task.priority} />
              <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                {toTitleLabel(task.taskType)}
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <BackButton href="/tasks" label="Back to tasks" />
              <h1 className="min-w-0 break-words text-3xl font-semibold tracking-normal">
                {task.title}
              </h1>
            </div>
            {task.description && (
              <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {task.description}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog
              open={editOpen}
              onOpenChange={setEditOpen}
              onDelete={() => setDeleteOpen(true)}
            >
              <DialogTrigger asChild>
                <Button variant="outline">Edit</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit task</DialogTitle>
                  <DialogDescription>
                    Update ownership, due date, priority, or task details.
                  </DialogDescription>
                </DialogHeader>
                <TaskForm
                  members={members}
                  initialTask={task}
                  initialRecurrence={taskDetails?.recurrence}
                  submitLabel="Save changes"
                  onSubmit={handleUpdate}
                />
              </DialogContent>
            </Dialog>
            {task.status !== "done" && task.status !== "cancelled" && (
              <Button
                variant="accent"
                onClick={() => void markDone({ householdId, taskId: task._id })}
              >
                Mark done
              </Button>
            )}
            {task.status !== "cancelled" && (
              <Button
                variant="outline"
                onClick={() =>
                  void cancelTask({ householdId, taskId: task._id })
                }
              >
                Cancel
              </Button>
            )}
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border bg-card p-5 [box-shadow:var(--shadow-card)]">
          <h2 className="font-semibold">Task details</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailItem
              label="Due date"
              value={formatDate(task.dueAt)}
              icon={CalendarClock}
            />
            <DetailItem
              label="Created"
              value={formatDateTime(task.createdAt)}
            />
            <DetailItem
              label="Updated"
              value={formatDateTime(task.updatedAt)}
            />
            <DetailItem
              label="Recurrence"
              value={task.recurrenceRuleId ? "Recurring template" : "None"}
              icon={Repeat}
            />
          </div>
          <div className="mt-6 grid gap-2">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={task.status}
              onValueChange={(value) =>
                void handleStatusChange(value as Doc<"tasks">["status"])
              }
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {toTitleLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {task.recurrenceRuleId && (
            <Button
              className="mt-6"
              variant="outline"
              onClick={() =>
                void generateRecurringInstances({
                  householdId,
                  taskId: task._id,
                })
              }
            >
              Generate next instances
            </Button>
          )}
        </div>

        <RecentActivityPanel activity={activity ?? []} />
      </section>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteError(null);
        }}
        title="Delete task?"
        description={`This permanently deletes "${task.title}" and related reminders. This cannot be undone.`}
        actionLabel="Delete task"
        pending={deletePending}
        error={deleteError}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function DetailItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border p-4 transition-colors hover:border-foreground/15">
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 flex items-center gap-2 text-sm">
        {Icon && <Icon className="size-4 text-muted-foreground" />}
        {value}
      </p>
    </div>
  );
}
