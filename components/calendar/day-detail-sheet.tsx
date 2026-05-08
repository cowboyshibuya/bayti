"use client";

import {
  startOfDay,
  endOfDay,
} from "date-fns";
import { CalendarDays } from "lucide-react";

import type { CalendarEntry } from "./types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/dates";
import { CalendarEntryCard } from "./calendar-entry-pill";

export function DayEventDialog({
  day,
  entries,
  open,
  onOpenChange,
}: {
  day: Date | null;
  entries: CalendarEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!day) return null;

  const dayStart = startOfDay(day).getTime();
  const dayEnd = endOfDay(day).getTime();

  const dayEvents = entries.filter(
    (entry) =>
      entry.entityType === "event" &&
      entry.date >= dayStart &&
      entry.date <= dayEnd,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" />
            {formatDate(day.getTime())}
          </DialogTitle>
          <DialogDescription>
            {dayEvents.length === 1
              ? "1 event scheduled."
              : `${dayEvents.length} events scheduled.`}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 grid gap-3">
          {dayEvents.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No events scheduled for this day.
            </div>
          )}
          {dayEvents.map((entry) => (
            <CalendarEntryCard
              key={`${entry.entityType}-${entry.id}`}
              entry={entry}
              clickBehavior="event-detail"
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
