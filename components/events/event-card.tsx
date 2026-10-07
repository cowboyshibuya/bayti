"use client";

import Link from "next/link";
import { EntityEditButton } from "@/components/shared/entity-edit-button";
import { CalendarDays, MapPin } from "lucide-react";
import { motion } from "framer-motion";

import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { formatEventDateTime } from "@/lib/dates";
import { EventStatusBadge } from "./event-status-badge";

export function EventCard({
  event,
  onCancel,
}: {
  event: Doc<"events">;
  onCancel?: (event: Doc<"events">) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}

      className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-[0_12px_32px_rgba(25,25,25,0.04)] transition-colors hover:border-foreground/14 hover:bg-muted/45 dark:bg-white/[0.04] dark:hover:border-white/[0.13] dark:hover:bg-white/[0.06]"
    >
      <div className="flex items-start justify-between gap-3">
        <EntityEditButton
          entity={{ kind: "event", value: event }}
          href={`/events/${event._id}`}
        >
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <h3 className="min-w-0 flex-1 truncate font-semibold text-foreground">
              {event.title}
            </h3>
          </div>
          {event.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {event.description}
            </p>
          )}
        </EntityEditButton>
        {onCancel &&
          event.status !== "cancelled" &&
          event.status !== "completed" && (
            <Button size="sm" variant="outline" onClick={() => onCancel(event)}>
              Cancel
            </Button>
          )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          href={`/events/${event._id}`}
          className="ml-auto rounded-lg px-2 py-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2"
        >
          Details
        </Link>
        <EventStatusBadge status={event.status} />
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/45 px-2 py-0.5 text-xs text-muted-foreground dark:bg-white/[0.035]">
          <CalendarDays className="size-3" />
          {formatEventDateTime({
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            isAllDay: event.isAllDay,
          })}
        </span>
        {event.location && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/45 px-2 py-0.5 text-xs text-muted-foreground dark:bg-white/[0.035]">
            <MapPin className="size-3" />
            {event.location}
          </span>
        )}
      </div>
    </motion.div>
  );
}
