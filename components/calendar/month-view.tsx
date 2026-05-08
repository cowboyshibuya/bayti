"use client";

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  format,
} from "date-fns";
import { motion } from "framer-motion";

import type { CalendarEntry } from "./types";
import { cn } from "@/lib/utils";
import { CalendarEntryPill } from "./calendar-entry-pill";

export function MonthView({
  currentDate,
  entries,
  onSelectDay,
}: {
  currentDate: Date;
  entries: CalendarEntry[];
  onSelectDay: (day: Date) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const today = new Date();
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card/90 shadow-[0_18px_55px_rgba(25,25,25,0.07)] backdrop-blur-xl dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.18)]">
      <div className="grid grid-cols-7 border-b border-border">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-xs font-medium text-foreground/42"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((date, index) => {
          const dayStart = date.getTime();
          const dayEnd = addDays(date, 1).getTime() - 1;
          const dayEntries = entries.filter(
            (e) => e.date >= dayStart && e.date <= dayEnd,
          );
          const isCurrentMonth = isSameMonth(date, monthStart);
          const isToday = isSameDay(date, today);

          return (
            <motion.div
              key={date.toISOString()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.005 }}
              className={cn(
                "relative min-h-[96px] cursor-pointer border-b border-r border-border p-1.5 transition-colors last:border-r-0 hover:bg-muted/45 sm:min-h-[120px] dark:hover:bg-white/[0.045]",
                !isCurrentMonth && "bg-muted/25 dark:bg-white/[0.02]",
                isToday && "bg-accent/8",
              )}
              onClick={() => onSelectDay(date)}
            >
              <div className="flex justify-end">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                    isToday
                      ? "bg-primary text-primary-foreground"
                      : !isCurrentMonth
                        ? "text-foreground/26"
                        : "text-foreground/72",
                  )}
                >
                  {format(date, "d")}
                </span>
              </div>
              <div className="mt-1 flex flex-col gap-1">
                {dayEntries.slice(0, 3).map((entry) => (
                  <CalendarEntryPill key={`${entry.entityType}-${entry.id}`} entry={entry} />
                ))}
                {dayEntries.length > 3 && (
                  <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-foreground/38 hover:bg-muted/60 dark:hover:bg-white/[0.06]">
                    +{dayEntries.length - 3} more
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
