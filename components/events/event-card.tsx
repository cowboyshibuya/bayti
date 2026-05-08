"use client";

import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { motion } from "framer-motion";

import type { Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
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
      whileHover={{ y: -1, boxShadow: "var(--shadow-card)" }}
      className="rounded-2xl border border-border bg-card/80 p-4 shadow-[0_12px_32px_rgba(25,25,25,0.04)] transition-colors hover:border-foreground/14 hover:bg-muted/45 dark:bg-white/[0.04] dark:hover:border-white/[0.13] dark:hover:bg-white/[0.06]"
    >
      <div className="flex items-start justify-between gap-3">
        <Link href={`/events/${event._id}`} className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0 text-foreground/42" />
            <h3 className="truncate font-semibold text-foreground/88">{event.title}</h3>
          </div>
          {event.description && (
            <p className="mt-1 line-clamp-2 text-sm text-foreground/42">
              {event.description}
            </p>
          )}
        </Link>
        {onCancel && event.status !== "cancelled" && event.status !== "completed" && (
          <Button size="sm" variant="outline" onClick={() => onCancel(event)}>
            Cancel
          </Button>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <EventStatusBadge status={event.status} />
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/45 px-2 py-0.5 text-xs text-foreground/42 dark:bg-white/[0.035]">
          <CalendarDays className="size-3" />
          {formatDate(event.startsAt)}
          {event.isAllDay && " (All day)"}
        </span>
        {event.location && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/45 px-2 py-0.5 text-xs text-foreground/42 dark:bg-white/[0.035]">
            <MapPin className="size-3" />
            {event.location}
          </span>
        )}
      </div>
    </motion.div>
  );
}
