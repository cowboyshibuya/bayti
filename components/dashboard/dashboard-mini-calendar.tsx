"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {addDays,addMonths,endOfMonth,endOfWeek,format,isSameDay,isSameMonth,startOfMonth,startOfWeek} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DayEventDialog } from "@/components/calendar/day-detail-sheet";
import type { CalendarEntry } from "@/components/calendar/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PanelShell } from "./panel-shell";

export function DashboardMiniCalendar({
  householdId,
}: {
  householdId: Id<"households">;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dayDialogOpen, setDayDialogOpen] = useState(false);

  const { days, startDate, endDate } = useMemo(() => {
    const monthStart = startOfMonth(visibleMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const calendarDays: Date[] = [];

    let day = calendarStart;
    while (day <= calendarEnd) {
      calendarDays.push(day);
      day = addDays(day, 1);
    }

    return {
      days: calendarDays,
      startDate: calendarStart.getTime(),
      endDate: calendarEnd.getTime(),
    };
  }, [visibleMonth]);

  const entries = useQuery(api.calendar.getCalendarEntries, {
    householdId,
    startDate,
    endDate,
  });

  const calendarEntries = entries ?? [];
  const monthStart = startOfMonth(visibleMonth);
  const today = new Date();

  function openDay(day: Date) {
    setSelectedDay(day);
    setDayDialogOpen(true);
  }

  return (
    <PanelShell
      title="Calendar"
      description={format(visibleMonth, "MMMM yyyy")}
      action={
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setVisibleMonth((date) => addMonths(date, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setVisibleMonth((date) => addMonths(date, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/calendar">Open</Link>
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-foreground/42">
        {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayEvents = getDayEvents(calendarEntries, day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, today);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => openDay(day)}
              className={cn(
                "flex aspect-square min-h-10 flex-col items-center justify-center rounded-xl border border-transparent text-xs transition-colors hover:border-border hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !isCurrentMonth && "text-foreground/24",
                isCurrentMonth && "text-foreground/70",
                isToday && "bg-accent/10 text-accent",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full",
                  isToday && "bg-primary text-primary-foreground",
                )}
              >
                {format(day, "d")}
              </span>
              <span className="mt-1 flex h-1.5 items-center justify-center gap-0.5">
                {dayEvents.slice(0, 3).map((event) => (
                  <span
                    key={event.id}
                    className="size-1.5 rounded-full bg-info"
                    aria-hidden="true"
                  />
                ))}
              </span>
              {dayEvents.length > 3 && (
                <span className="sr-only">{dayEvents.length} events</span>
              )}
            </button>
          );
        })}
      </div>
      {entries === undefined && (
        <div className="mt-3 flex items-center gap-2 text-xs text-foreground/36">
          <CalendarDays className="size-3.5" />
          Loading events
        </div>
      )}
      <DayEventDialog
        day={selectedDay}
        entries={calendarEntries}
        open={dayDialogOpen}
        onOpenChange={setDayDialogOpen}
      />
    </PanelShell>
  );
}

function getDayEvents(entries: CalendarEntry[], day: Date) {
  const dayStart = day.getTime();
  const dayEnd = addDays(day, 1).getTime() - 1;

  return entries.filter(
    (entry) =>
      entry.entityType === "event" &&
      entry.date >= dayStart &&
      entry.date <= dayEnd,
  );
}
