"use client";

import { EntityCollection } from "@/components/shared/entity-collection";
import { CalendarDays } from "lucide-react";

import type { Doc } from "@/convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/empty-state";
import { EventCard } from "./event-card";

export function EventList({
  events,
  defaultDescending = false,
  emptyTitle = "No events found",
  emptyDescription = "Create an event to start tracking household activities.",
  onCancel,
}: {
  events: Doc<"events">[];
  defaultDescending?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onCancel?: (event: Doc<"events">) => void;
}) {
  return (
    <EntityCollection
      items={events}
      date={(item) => item.startsAt}
      defaultDescending={defaultDescending}
    >
      {(visible) =>
        visible.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <div className="grid gap-3">
            {visible.map((event) => (
              <EventCard key={event._id} event={event} onCancel={onCancel} />
            ))}
          </div>
        )
      }
    </EntityCollection>
  );
}
