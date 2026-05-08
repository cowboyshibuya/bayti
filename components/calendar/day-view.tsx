"use client";

import { startOfDay, endOfDay } from "date-fns";
import { motion } from "framer-motion";

import type { CalendarEntry } from "./types";
import { CalendarEntryCard } from "./calendar-entry-pill";

export function DayView({
  currentDate,
  entries,
}: {
  currentDate: Date;
  entries: CalendarEntry[];
}) {
  const dayStart = startOfDay(currentDate).getTime();
  const dayEnd = endOfDay(currentDate).getTime();

  const dayEntries = entries.filter(
    (e) => e.date >= dayStart && e.date <= dayEnd,
  );

  return (
    <div className="mx-auto max-w-2xl">
      {dayEntries.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground"
        >
          Nothing scheduled for this day.
        </motion.div>
      )}
      <div className="grid gap-3">
        {dayEntries.map((entry, index) => (
          <motion.div
            key={`${entry.entityType}-${entry.id}`}
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
