"use client";

import { use, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CalendarDays, MapPin, StickyNote, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { RecentActivityPanel } from "@/components/dashboard/recent-activity-panel";
import { LoadingState } from "@/components/shared/loading-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  EventForm,
  type EventFormSubmitValues,
} from "@/components/events/event-form";
import { EventStatusBadge } from "@/components/events/event-status-badge";
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
import { EVENT_STATUSES } from "@/lib/constants";
import { formatDateTime, formatEventDateTime } from "@/lib/dates";
import { toTitleLabel } from "@/lib/formatters";
import { useHousehold } from "@/lib/household-context";

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
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
    householdId ? { householdId, entityType: "event", entityId: id } : "skip",
  );
  const updateEvent = useMutation(api.events.update);
  const updateStatus = useMutation(api.events.updateStatus);
  const cancelEvent = useMutation(api.events.cancel);
  const removeEvent = useMutation(api.events.remove);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!householdId || event === undefined || members === undefined) {
    return <LoadingState label="Loading event" />;
  }

  async function handleUpdate(values: EventFormSubmitValues) {
    if (!householdId || !event) return;

    await updateEvent({
      householdId,
      eventId: event._id,
      status: values.status,
      title: values.title,
      description: values.description ?? "",
      note: values.note ?? "",
      startsAt: values.startsAt,
      endsAt: values.endsAt ?? null,
      isAllDay: values.isAllDay,
      location: values.location ?? "",
      ownerUserId: values.ownerUserId ?? null,
    });
    setEditOpen(false);
  }

  async function handleStatusChange(status: Doc<"events">["status"]) {
    if (!householdId || !event) return;
    await updateStatus({ householdId, eventId: event._id, status });
  }

  async function handleDelete() {
    if (!householdId || !event) return;

    setDeletePending(true);
    setDeleteError(null);

    try {
      await removeEvent({ householdId, eventId: event._id });
      setDeleteOpen(false);
      router.push("/events");
    } catch (caught) {
      setDeleteError(
        caught instanceof Error ? caught.message : "Could not delete event.",
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
              <EventStatusBadge status={event.status} />
              {event.isAllDay && (
                <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs text-accent">
                  All day
                </span>
              )}
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <BackButton href="/events" label="Back to events" />
              <h1 className="min-w-0 break-words text-3xl font-semibold tracking-normal">
                {event.title}
              </h1>
            </div>
            {event.description && (
              <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {event.description}
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
                  <DialogTitle>Edit event</DialogTitle>
                  <DialogDescription>
                    Update date, time, note, location, or event details.
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
                onClick={() =>
                  void cancelEvent({ householdId, eventId: event._id })
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
          <h2 className="font-semibold">Event details</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailItem
              label="Date"
              value={formatEventDateTime({
                startsAt: event.startsAt,
                endsAt: event.endsAt,
                isAllDay: event.isAllDay,
              })}
              icon={CalendarDays}
            />
            {event.location && (
              <DetailItem
                label="Location"
                value={event.location}
                icon={MapPin}
              />
            )}
            <DetailItem
              label="Created"
              value={formatDateTime(event.createdAt)}
            />
            <DetailItem
              label="Updated"
              value={formatDateTime(event.updatedAt)}
            />
            {event.note && (
              <DetailItem label="Note" value={event.note} icon={StickyNote} />
            )}
          </div>
          <div className="mt-6 grid gap-2">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={event.status}
              onValueChange={(value) =>
                void handleStatusChange(value as Doc<"events">["status"])
              }
            >
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
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteError(null);
        }}
        title="Delete event?"
        description={`This permanently deletes "${event.title}" and related reminders. This cannot be undone.`}
        actionLabel="Delete event"
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
