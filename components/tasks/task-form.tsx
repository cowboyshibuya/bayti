"use client";

import {
  EntityForm,
  useSavedForm,
  OptionalFields,
} from "@/components/shared/entity-form";

import { FormEvent, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/shared/date-picker";
import { MemberDisplay } from "@/components/shared/member-display";
import {
  RECURRENCE_FREQUENCIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
} from "@/lib/constants";
import { toTitleLabel } from "@/lib/formatters";
import { formatDateInputValue, parseLocalDate } from "@/lib/dates";
import { taskFormSchema } from "@/lib/validations";

export type TaskFormSubmitValues = {
  title: string;
  description?: string;
  status: Doc<"tasks">["status"];
  priority: Doc<"tasks">["priority"];
  taskType: Doc<"tasks">["taskType"];
  ownerUserId?: Id<"users">;
  dueAt?: number;
  recurrence?: {
    frequency: Doc<"recurrenceRules">["frequency"];
    interval: number;
    startsAt: number;
    endsAt?: number;
  } | null;
};

export function TaskForm({
  members,
  initialTask,
  initialRecurrence,
  submitLabel,
  onSubmit,
}: {
  members: { membership: Doc<"householdMembers">; user: Doc<"users"> | null }[];
  initialTask?: Doc<"tasks">;
  initialRecurrence?: Doc<"recurrenceRules"> | null;
  submitLabel: string;
  onSubmit: (values: TaskFormSubmitValues) => Promise<void>;
}) {
  const saved = useSavedForm();
  const [title, setTitle] = useState(initialTask?.title ?? "");
  const [description, setDescription] = useState(
    initialTask?.description ?? "",
  );
  const [status, setStatus] = useState<Doc<"tasks">["status"]>(
    initialTask?.status ?? "todo",
  );
  const [priority, setPriority] = useState<Doc<"tasks">["priority"]>(
    initialTask?.priority ?? "medium",
  );
  const [taskType, setTaskType] = useState<Doc<"tasks">["taskType"]>(
    initialTask?.taskType ?? "one_off",
  );
  const [ownerUserId, setOwnerUserId] = useState<string>(
    initialTask?.ownerUserId ?? "unassigned",
  );
  const [dueDate, setDueDate] = useState(
    formatDateInputValue(initialTask?.dueAt),
  );
  const [recurring, setRecurring] = useState(Boolean(initialRecurrence));
  const [frequency, setFrequency] = useState<
    Doc<"recurrenceRules">["frequency"]
  >(initialRecurrence?.frequency ?? "weekly");
  const [interval, setInterval] = useState(initialRecurrence?.interval ?? 1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberOptions = useMemo(
    () =>
      members.filter(
        (member): member is typeof member & { user: Doc<"users"> } =>
          Boolean(member.user),
      ),
    [members],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    const parsed = taskFormSchema.safeParse({
      title,
      description,
      status,
      priority,
      taskType,
      ownerUserId: ownerUserId === "unassigned" ? undefined : ownerUserId,
      dueDate,
      recurring,
      frequency,
      interval,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the task form.");
      setPending(false);
      return;
    }

    const dueAt = parseLocalDate(dueDate);
    if (recurring && dueAt === undefined) {
      setError("Recurring tasks need a due date.");
      setPending(false);
      return;
    }

    try {
      await onSubmit({
        title: parsed.data.title,
        description: parsed.data.description,
        status,
        priority,
        taskType,
        ownerUserId:
          ownerUserId === "unassigned"
            ? undefined
            : (ownerUserId as Id<"users">),
        dueAt,
        recurrence:
          recurring && dueAt
            ? {
                frequency,
                interval,
                startsAt: initialRecurrence?.startsAt ?? dueAt,
                endsAt: initialRecurrence?.endsAt,
              }
            : initialTask
              ? null
              : undefined,
      });
      saved();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save task.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <EntityForm onSubmit={handleSubmit} pending={pending} error={error}>
      <div className="grid gap-2">
        <Label htmlFor="task-title">Title</Label>
        <Input
          id="task-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Schedule boiler service"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="task-status">Status</Label>
          <Select
            value={status}
            onValueChange={(value) =>
              setStatus(value as Doc<"tasks">["status"])
            }
          >
            <SelectTrigger id="task-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {toTitleLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="task-owner">Owner</Label>
          <Select value={ownerUserId} onValueChange={setOwnerUserId}>
            <SelectTrigger id="task-owner">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {memberOptions.map((member) => (
                <SelectItem key={member.user._id} value={member.user._id}>
                  <MemberDisplay
                    member={member}
                    detail={member.user.email}
                    avatarClassName="size-6"
                  />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="task-due-date">Due date</Label>
          <DatePicker
            id="task-due-date"
            value={dueDate}
            onChange={setDueDate}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="task-priority">Priority</Label>
          <Select
            value={priority}
            onValueChange={(value) =>
              setPriority(value as Doc<"tasks">["priority"])
            }
          >
            <SelectTrigger id="task-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map((value) => (
                <SelectItem key={value} value={value}>
                  {toTitleLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="task-type">Type</Label>
          <Select
            value={taskType}
            onValueChange={(value) =>
              setTaskType(value as Doc<"tasks">["taskType"])
            }
          >
            <SelectTrigger id="task-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {toTitleLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {
        <div className="rounded-xl border p-4">
          <label className="flex items-center gap-3 text-sm font-medium">
            <Checkbox
              checked={recurring}
              onCheckedChange={(checked) => setRecurring(Boolean(checked))}
            />
            Recurring task
          </label>
          {recurring && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="task-frequency">Frequency</Label>
                <Select
                  value={frequency}
                  onValueChange={(value) =>
                    setFrequency(value as Doc<"recurrenceRules">["frequency"])
                  }
                >
                  <SelectTrigger id="task-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_FREQUENCIES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {toTitleLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-interval">Interval</Label>
                <Input
                  id="task-interval"
                  type="number"
                  min={1}
                  max={24}
                  value={interval}
                  onChange={(event) => setInterval(Number(event.target.value))}
                />
              </div>
            </div>
          )}
        </div>
      }

      <OptionalFields>
        <div className="grid gap-2">
          <Label htmlFor="task-description">Description</Label>
          <Textarea
            id="task-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add links, context, or notes."
            rows={3}
          />
        </div>
      </OptionalFields>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {submitLabel}
      </Button>
    </EntityForm>
  );
}
