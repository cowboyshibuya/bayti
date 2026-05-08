"use client";

import {
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  format,
} from "date-fns";
import { motion } from "framer-motion";

import type { CalendarEntry } from "./types";
import { cn } from "@/lib/utils";
import { CalendarEntryCard } from "./calendar-entry-pill";

export function WeekView({
  currentDate,
  entries,
  onSelectDay,
}: {
  currentDate: Date;
  entries: CalendarEntry[];
  onSelectDay: (day: Date) => void;
}) {
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);

  const days: Date[] = [];
  let day = weekStart;
  while (day <= weekEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const today = new Date();

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card/90 shadow-[0_18px_55px_rgba(25,25,25,0.07)] backdrop-blur-xl dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.18)]">
      <div className="grid grid-cols-7 border-b border-border">
        {days.map((date) => {
          const isToday = isSameDay(date, today);
          return (
            <div
              key={date.toISOString()}
              className={cn(
                "px-1 py-2 text-center sm:px-2",
                isToday && "bg-accent/8",
              )}
            >
              <p className="text-xs text-foreground/42">{format(date, "EEE")}</p>
              <p
                className={cn(
                  "mt-0.5 inline-flex size-6 items-center justify-center rounded-full text-sm font-semibold sm:size-7",
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground",
                )}
              >
                {format(date, "d")}
              </p>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-7">
        {days.map((date, index) => {
          const dayStart = date.getTime();
          const dayEnd = addDays(date, 1).getTime() - 1;
          const dayEntries = entries.filter(
            (e) => e.date >= dayStart && e.date <= dayEnd,
          );

          return (
            <motion.div
              key={date.toISOString()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.02 }}
              className="min-h-[200px] cursor-pointer border-r border-border p-1.5 transition-colors last:border-r-0 hover:bg-muted/45 sm:min-h-[300px] sm:p-2 dark:hover:bg-white/[0.045]"
              onClick={() => onSelectDay(date)}
            >
              <div className="flex flex-col gap-2">
                {dayEntries.map((entry) => (
                  <CalendarEntryCard
                    key={`${entry.entityType}-${entry.id}`}
                    entry={entry}
                  />
                ))}
                {dayEntries.length === 0 && (
                  <p className="mt-4 text-center text-xs text-foreground/30">
                    No entries
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
