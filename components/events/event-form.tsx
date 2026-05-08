"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import type { Doc, Id } from "../../../convex/_generated/dataModel";
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
import { EVENT_STATUSES } from "@/lib/constants";
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
  const [title, setTitle] = useState(initialEvent?.title ?? "");
  const [description, setDescription] = useState(initialEvent?.description ?? "");
  const [note, setNote] = useState(initialEvent?.note ?? "");
  const [date, setDate] = useState(
    initialEvent?.startsAt
      ? new Date(initialEvent.startsAt).toISOString().slice(0, 10)
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
      members.filter((member): member is typeof member & { user: Doc<"users"> } =>
        Boolean(member.user),
      ),
    [members],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const parsed = eventFormSchema.safeParse({
      title,
      description,
      note,
      date,
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

    const startsAt = isAllDay
      ? new Date(`${date}T00:00:00`).getTime()
      : new Date(`${date}T12:00:00`).getTime();

    try {
      await onSubmit({
        title: parsed.data.title,
        description: parsed.data.description,
        note: parsed.data.note,
        startsAt,
        isAllDay: parsed.data.isAllDay,
        location: parsed.data.location,
        status,
        ownerUserId:
          ownerUserId === "unassigned" ? undefined : (ownerUserId as Id<"users">),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save event.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Date</Label>
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as Doc<"events">["status"])}>
            <SelectTrigger>
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
          <Label htmlFor="event-location">Location</Label>
          <Input
            id="event-location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="e.g. Home, Restaurant, Park"
          />
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <label className="flex items-center gap-3 text-sm font-medium">
          <Checkbox
            checked={isAllDay}
            onCheckedChange={(checked) => setIsAllDay(Boolean(checked))}
          />
          All-day event
        </label>
      </div>

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
