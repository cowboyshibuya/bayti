"use client";

import { use, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, CalendarDays, MapPin, StickyNote } from "lucide-react";
import Link from "next/link";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { RecentActivityPanel } from "@/components/dashboard/recent-activity-panel";
import { LoadingState } from "@/components/shared/loading-state";
import { EventForm, type EventFormSubmitValues } from "@/components/events/event-form";
import { EventStatusBadge } from "@/components/events/event-status-badge";
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
import { EVENT_STATUSES } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/dates";
import { toTitleLabel } from "@/lib/formatters";
import { useHousehold } from "@/lib/household-context";

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { household } = useHousehold();
  const householdId = household?._id;
  const event = useQuery(
    api.events.get,
    householdId ? { householdId, eventId: id as Id<"events"> } : "skip",
  );
  const members = useQuery(
    api.members.listAssignable,
    householdId ? { householdId } : "skip",
  );
  const activity = useQuery(
    api.activity.listForEntity,
    householdId
      ? { householdId, entityType: "event", entityId: id }
      : "skip",
  );
  const updateEvent = useMutation(api.events.update);
  const updateStatus = useMutation(api.events.updateStatus);
  const cancelEvent = useMutation(api.events.cancel);
  const [editOpen, setEditOpen] = useState(false);

  if (!householdId || event === undefined || members === undefined) {
    return <LoadingState label="Loading event" />;
  }

  async function handleUpdate(values: EventFormSubmitValues) {
    if (!householdId || !event) return;

    await updateEvent({
      householdId,
      eventId: event._id,
      title: values.title,
      description: values.description,
      note: values.note,
      startsAt: values.startsAt,
      endsAt: values.endsAt ?? null,
      isAllDay: values.isAllDay,
      location: values.location,
      ownerUserId: values.ownerUserId ?? null,
    });
    await updateStatus({ householdId, eventId: event._id, status: values.status });
    setEditOpen(false);
  }

  async function handleStatusChange(status: Doc<"events">["status"]) {
    if (!householdId || !event) return;
    await updateStatus({ householdId, eventId: event._id, status });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div>
        <Button variant="ghost" asChild className="-ml-2 mb-4">
          <Link href="/events">
            <ArrowLeft className="size-4" />
            Back to events
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <EventStatusBadge status={event.status} />
              {event.isAllDay && (
                <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs text-accent">
                  All day
                </span>
              )}
            </div>
            <h1 className="text-3xl font-semibold tracking-normal">{event.title}</h1>
            {event.description && (
              <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {event.description}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Edit</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit event</DialogTitle>
                  <DialogDescription>
                    Update date, note, location, or event details.
                  </DialogDescription>
                </DialogHeader>
                <EventForm
                  members={members}
                  initialEvent={event}
                  submitLabel="Save changes"
                  onSubmit={handleUpdate}
                />
              </DialogContent>
            </Dialog>
            {event.status !== "cancelled" && (
              <Button
                variant="outline"
                onClick={() => void cancelEvent({ householdId, eventId: event._id })}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border bg-card p-5 [box-shadow:var(--shadow-card)]">
          <h2 className="font-semibold">Event details</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailItem label="Date" value={formatDate(event.startsAt)} icon={CalendarDays} />
            {event.location && (
              <DetailItem label="Location" value={event.location} icon={MapPin} />
            )}
            <DetailItem label="Created" value={formatDateTime(event.createdAt)} />
            <DetailItem label="Updated" value={formatDateTime(event.updatedAt)} />
            {event.note && (
              <DetailItem label="Note" value={event.note} icon={StickyNote} />
            )}
          </div>
          <div className="mt-6 grid gap-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={event.status} onValueChange={(value) => void handleStatusChange(value as Doc<"events">["status"])}>
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {toTitleLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <RecentActivityPanel activity={activity ?? []} />
      </section>
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
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 flex items-center gap-2 text-sm">
        {Icon && <Icon className="size-4 text-muted-foreground" />}
        {value}
      </p>
    </div>
  );
}
