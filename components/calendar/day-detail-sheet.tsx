"use client";

import { startOfDay, endOfDay } from "date-fns";
import type { CalendarEntry } from "./types";
import { QuickCreateDialog } from "@/components/shared/quick-create-dialog";
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
  const dayEntries = entries
    .filter((entry) => entry.date >= dayStart && entry.date <= dayEnd)
    .sort((a, b) => a.date - b.date || a.id.localeCompare(b.id));
  return (
    <QuickCreateDialog
      key={day.getTime()}
      date={day}
      open={open}
      onOpenChange={onOpenChange}
      showTrigger={false}
    >
      <section
        className="mt-5 grid min-w-0 grid-cols-1 gap-3 border-t pt-4"
        aria-label="Scheduled for this day"
      >
        <h3 className="text-sm font-semibold">Scheduled for this day</h3>
        {dayEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing scheduled yet.
          </p>
        ) : (
          dayEntries.map((entry) => (
            <CalendarEntryCard
              key={`${entry.entityType}-${entry.id}`}
              entry={entry}
              clickBehavior="entity-detail"
            />
          ))
        )}
      </section>
    </QuickCreateDialog>
  );
}
