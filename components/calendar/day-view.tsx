"use client";

import { startOfDay, endOfDay } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

import type { CalendarEntry } from "./types";
import { CalendarEntryCard } from "./calendar-entry-pill";

export function DayView({
  currentDate,
  entries,
  onSelectDay,
}: {
  currentDate: Date;
  entries: CalendarEntry[];
  onSelectDay: (day: Date) => void;
}) {
  const dayStart = startOfDay(currentDate).getTime();
  const dayEnd = endOfDay(currentDate).getTime();

  const dayEntries = entries.filter(
    (e) => e.date >= dayStart && e.date <= dayEnd,
  );

  return (
    <div className="mx-auto grid min-w-0 max-w-2xl grid-cols-1 gap-4">
      <Button
        variant="outline"
        className="h-11 justify-start"
        onClick={() => onSelectDay(currentDate)}
        aria-haspopup="dialog"
      >
        <Plus className="size-4" />
        Add to this day
      </Button>
      {dayEntries.length === 0 && (
        <motion.button
          type="button"
          onClick={() => onSelectDay(currentDate)}
          aria-haspopup="dialog"
          aria-label="Create something for this day"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground"
        >
          Nothing scheduled for this day. Click to add something.
        </motion.button>
      )}
      <div className="grid min-w-0 grid-cols-1 gap-3">
        {dayEntries.map((entry, index) => (
          <motion.div
            key={`${entry.entityType}-${entry.id}`}
            className="min-w-0"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <CalendarEntryCard entry={entry} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
