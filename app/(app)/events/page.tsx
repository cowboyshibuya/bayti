"use client";

import { useMutation, useQuery } from "convex/react";
import { Grid3X3, List, Plus } from "lucide-react";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { LoadingState } from "@/components/shared/loading-state";
import { EventForm, type EventFormSubmitValues } from "@/components/events/event-form";
import { EventList } from "@/components/events/event-list";
import { EventGrid } from "@/components/events/event-grid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHousehold } from "@/lib/household-context";

const eventViews = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "all", label: "All" },
  { value: "mine", label: "Mine" },
] as const;

type EventView = (typeof eventViews)[number]["value"];

export default function EventsPage() {
  const [layout, setLayout] = useState<"list" | "grid">("list");
  const { household } = useHousehold();
  const householdId = household?._id;
  const members = useQuery(
    api.members.listAssignable,
    householdId ? { householdId } : "skip",
  );
  const createEvent = useMutation(api.events.create);
  const cancelEvent = useMutation(api.events.cancel);

  if (!householdId || members === undefined) {
    return <LoadingState label="Loading events" />;
  }

  const currentHouseholdId = householdId;

  async function handleCreate(values: EventFormSubmitValues) {
    await createEvent({
      householdId: currentHouseholdId,
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
  }

  async function handleCancel(event: Doc<"events">) {
    await cancelEvent({ householdId: currentHouseholdId, eventId: event._id });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {household?.name}
          </p>
          <h1 className="text-2xl font-semibold">Events</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-0.5">
            <Button
              variant={layout === "list" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setLayout("list")}
            >
              <List className="size-4" />
            </Button>
            <Button
              variant={layout === "grid" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setLayout("grid")}
            >
              <Grid3X3 className="size-4" />
            </Button>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                Add event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add event</DialogTitle>
                <DialogDescription>
                  Add a date, note, location, and household context.
                </DialogDescription>
              </DialogHeader>
              <EventForm
                members={members}
                submitLabel="Add event"
                onSubmit={handleCreate}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="mt-6 grid gap-4">
        <TabsList className="h-auto flex-wrap justify-start">
          {eventViews.map((view) => (
            <TabsTrigger key={view.value} value={view.value}>
              {view.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <AnimatePresence mode="wait">
          {eventViews.map((view) => (
            <TabsContent key={view.value} value={view.value}>
              <EventViewPanel
                view={view.value}
                layout={layout}
                householdId={currentHouseholdId}
                onCancel={handleCancel}
              />
            </TabsContent>
          ))}
        </AnimatePresence>
      </Tabs>
    </div>
  );
}

function EventViewPanel({
  view,
  layout,
  householdId,
  onCancel,
}: {
  view: EventView;
  layout: "list" | "grid";
  householdId: Id<"households">;
  onCancel: (event: Doc<"events">) => void;
}) {
  const events = useQuery(api.events.list, {
    householdId,
    view,
  });

  if (events === undefined) {
    return (
      <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        Loading {view} events...
      </p>
    );
  }

  const Component = layout === "list" ? EventList : EventGrid;

  return (
    <Component
      events={events}
      emptyTitle={`No ${view} events`}
      emptyDescription="Add an event to start tracking household activities."
      onCancel={onCancel}
    />
  );
}
