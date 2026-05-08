import { CalendarDays } from "lucide-react";


import type { Doc } from "@/convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/empty-state";
import { EventCard } from "@/components/events/event-card";
import { PanelShell } from "./panel-shell";

export function UpcomingEventsPanel({ events }: { events: Doc<"events">[] }) {
  return (
    <PanelShell title="Upcoming events" description="Events coming up soon.">
      {events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No upcoming events"
          description="Events coming up will appear here."
        />
      ) : (
        <div className="grid gap-3">
          {events.map((event) => (
            <EventCard key={event._id} event={event} />
          ))}
        </div>
      )}
    </PanelShell>
  );
}
