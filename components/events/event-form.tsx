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
import { DatePicker, TimePicker } from "@/components/shared/date-picker";
import { MemberDisplay } from "@/components/shared/member-display";
import { EVENT_STATUSES } from "@/lib/constants";
import {
  formatDateInputValue,
  formatTimeInputValue,
  parseLocalDate,
  parseLocalDateTime,
} from "@/lib/dates";
import { toTitleLabel } from "@/lib/formatters";
import { eventFormSchema } from "@/lib/validations";

export type EventFormSubmitValues = {
  title: string;
  description?: string;
  note?: string;
  startsAt: number;
  endsAt?: number;
  isAllDay: boolean;
  location?: string;
  status: Doc<"events">["status"];
  ownerUserId?: Id<"users">;
};

export function EventForm({
  members,
  initialEvent,
  submitLabel,
  onSubmit,
}: {
  members: { membership: Doc<"householdMembers">; user: Doc<"users"> | null }[];
  initialEvent?: Doc<"events">;
  submitLabel: string;
  onSubmit: (values: EventFormSubmitValues) => Promise<void>;
}) {
  const saved = useSavedForm();
  const [title, setTitle] = useState(initialEvent?.title ?? "");
  const [description, setDescription] = useState(
    initialEvent?.description ?? "",
  );
  const [note, setNote] = useState(initialEvent?.note ?? "");
  const [date, setDate] = useState(
    formatDateInputValue(initialEvent?.startsAt),
  );
  const [startTime, setStartTime] = useState(
    initialEvent?.startsAt && !initialEvent.isAllDay
      ? formatTimeInputValue(initialEvent.startsAt)
      : "",
  );
  const [endTime, setEndTime] = useState(
    initialEvent?.endsAt && !initialEvent.isAllDay
      ? formatTimeInputValue(initialEvent.endsAt)
      : "",
  );
  const [isAllDay, setIsAllDay] = useState(initialEvent?.isAllDay ?? true);
  const [location, setLocation] = useState(initialEvent?.location ?? "");
  const [status, setStatus] = useState<Doc<"events">["status"]>(
    initialEvent?.status ?? "upcoming",
  );
  const [ownerUserId, setOwnerUserId] = useState<string>(
    initialEvent?.ownerUserId ?? "unassigned",
  );
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

    const parsed = eventFormSchema.safeParse({
      title,
      description,
      note,
      date,
      startTime,
      endTime,
      isAllDay,
      location,
      status,
      ownerUserId: ownerUserId === "unassigned" ? undefined : ownerUserId,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the event form.");
      setPending(false);
      return;
    }

    if (!isAllDay && !startTime) {
      setError("Choose a start time for timed events.");
      setPending(false);
      return;
    }

    const startsAt = isAllDay
      ? parseLocalDate(date, "00:00")
      : parseLocalDateTime(date, startTime);
    const endsAt =
      !isAllDay && endTime ? parseLocalDateTime(date, endTime) : undefined;

    if (startsAt === undefined) {
      setError("Choose a valid event date.");
      setPending(false);
      return;
    }

    if (endsAt !== undefined && endsAt <= startsAt) {
      setError("End time must be after the start time.");
      setPending(false);
      return;
    }

    try {
      await onSubmit({
        title: parsed.data.title,
        description: parsed.data.description,
        note: parsed.data.note,
        startsAt,
        endsAt,
        isAllDay: parsed.data.isAllDay,
        location: parsed.data.location,
        status,
        ownerUserId:
          ownerUserId === "unassigned"
            ? undefined
            : (ownerUserId as Id<"users">),
      });
      saved();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save event.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <EntityForm onSubmit={handleSubmit} pending={pending} error={error}>
      <div className="grid gap-2">
        <Label htmlFor="event-title">Title</Label>
        <Input
          id="event-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Family dinner"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="event-date">Date</Label>
          <DatePicker
            id="event-date"
            value={date}
            onChange={setDate}
            required
            allowClear={false}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="event-status">Status</Label>
          <Select
            value={status}
            onValueChange={(value) =>
              setStatus(value as Doc<"events">["status"])
            }
          >
            <SelectTrigger id="event-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {toTitleLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="event-owner">Owner</Label>
          <Select value={ownerUserId} onValueChange={setOwnerUserId}>
            <SelectTrigger id="event-owner">
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
          <Label htmlFor="event-location">Location</Label>
          <Input
            id="event-location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="e.g. Home, Restaurant, Park"
          />
        </div>
      </div>

      {!isAllDay && (
        <div className="grid gap-4 rounded-2xl border bg-muted/20 p-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="event-start-time">Start time</Label>
            <TimePicker
              id="event-start-time"
              value={startTime}
              onChange={setStartTime}
              placeholder="Start time"
              required
              allowClear={false}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="event-end-time">End time</Label>
            <TimePicker
              id="event-end-time"
              value={endTime}
              onChange={setEndTime}
              placeholder="Optional end time"
            />
          </div>
        </div>
      )}

      <div className="rounded-xl border p-4">
        <label className="flex items-center gap-3 text-sm font-medium">
          <Checkbox
            checked={isAllDay}
            onCheckedChange={(checked) => {
              const nextIsAllDay = Boolean(checked);
              setIsAllDay(nextIsAllDay);
              if (nextIsAllDay) {
                setStartTime("");
                setEndTime("");
              }
            }}
          />
          All-day event
        </label>
      </div>

      <OptionalFields>
        <div className="grid gap-2">
          <Label htmlFor="event-description">Description</Label>
          <Textarea
            id="event-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add context or details about the event."
            rows={2}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="event-note">Note</Label>
          <Textarea
            id="event-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add a personal note or reminder."
            rows={2}
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
