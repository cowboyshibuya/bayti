"use client";

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
import { MemberDisplay } from "@/components/shared/member-display";
import {
  RECURRENCE_FREQUENCIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
} from "@/lib/constants";
import { toTitleLabel } from "@/lib/formatters";
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
  };
};

export function TaskForm({
  members,
  initialTask,
  submitLabel,
  onSubmit,
}: {
  members: { membership: Doc<"householdMembers">; user: Doc<"users"> | null }[];
  initialTask?: Doc<"tasks">;
  submitLabel: string;
  onSubmit: (values: TaskFormSubmitValues) => Promise<void>;
}) {
  const [title, setTitle] = useState(initialTask?.title ?? "");
  const [description, setDescription] = useState(initialTask?.description ?? "");
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
    initialTask?.dueAt ? new Date(initialTask.dueAt).toISOString().slice(0, 10) : "",
  );
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] =
    useState<Doc<"recurrenceRules">["frequency"]>("weekly");
  const [interval, setInterval] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberOptions = useMemo(
    () =>
      members.filter((member): member is typeof member & { user: Doc<"users"> } =>
        Boolean(member.user),
      ),
    [members],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

    const dueAt = dueDate ? new Date(`${dueDate}T12:00:00`).getTime() : undefined;

    try {
      await onSubmit({
        title: parsed.data.title,
        description: parsed.data.description,
        status,
        priority,
        taskType,
        ownerUserId:
          ownerUserId === "unassigned" ? undefined : (ownerUserId as Id<"users">),
        dueAt,
        recurrence:
          recurring && dueAt
            ? {
                frequency,
                interval,
                startsAt: dueAt,
              }
            : undefined,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save task.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as Doc<"tasks">["status"])}>
            <SelectTrigger>
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
          <Label>Owner</Label>
          <Select value={ownerUserId} onValueChange={setOwnerUserId}>
            <SelectTrigger>
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
          <Label>Due date</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(value) => setPriority(value as Doc<"tasks">["priority"])}>
            <SelectTrigger>
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
          <Label>Type</Label>
          <Select value={taskType} onValueChange={(value) => setTaskType(value as Doc<"tasks">["taskType"])}>
            <SelectTrigger>
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

      {!initialTask && (
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
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={(value) => setFrequency(value as Doc<"recurrenceRules">["frequency"])}>
                  <SelectTrigger>
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
                <Label>Interval</Label>
                <Input
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
      )}

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}
