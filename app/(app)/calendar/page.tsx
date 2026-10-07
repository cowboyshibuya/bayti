"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
} from "date-fns";

import { api } from "@/convex/_generated/api";

import { LoadingState } from "@/components/shared/loading-state";
import {
  CalendarHeader,
  type CalendarView,
} from "@/components/calendar/calendar-header";
import { MonthView } from "@/components/calendar/month-view";
import { WeekView } from "@/components/calendar/week-view";
import { DayView } from "@/components/calendar/day-view";
import { DayEventDialog } from "@/components/calendar/day-detail-sheet";
import { useHousehold } from "@/lib/household-context";

function getQueryRange(view: CalendarView, date: Date) {
  if (view === "month") {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    return {
      startDate: startOfWeek(monthStart).getTime(),
      endDate: endOfWeek(monthEnd).getTime(),
    };
  }
  if (view === "week") {
    return {
      startDate: startOfWeek(date).getTime(),
      endDate: endOfWeek(date).getTime(),
    };
  }
  return {
    startDate: startOfDay(date).getTime(),
    endDate: endOfDay(date).getTime(),
  };
}

export default function CalendarPage() {
  const [view, setView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dayDialogOpen, setDayDialogOpen] = useState(false);

  const { household } = useHousehold();
  const householdId = household?._id;

  const { startDate, endDate } = useMemo(
    () => getQueryRange(view, currentDate),
    [view, currentDate],
  );

  const entries = useQuery(
    api.calendar.getCalendarEntries,
    householdId ? { householdId, startDate, endDate } : "skip",
  );

  if (!householdId || entries === undefined) {
    return <LoadingState label="Loading calendar" />;
  }

  function handleSelectDay(day: Date) {
    setSelectedDay(day);
    setDayDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <CalendarHeader
        view={view}
        currentDate={currentDate}
        onViewChange={setView}
        onDateChange={setCurrentDate}
      />

      <div className="mt-6">
        {view === "month" && (
          <MonthView
            currentDate={currentDate}
            entries={entries}
            onSelectDay={handleSelectDay}
          />
        )}
        {view === "week" && (
          <WeekView
            currentDate={currentDate}
            entries={entries}
            onSelectDay={handleSelectDay}
          />
        )}
        {view === "day" && (
          <DayView
            currentDate={currentDate}
            entries={entries}
            onSelectDay={handleSelectDay}
          />
        )}
      </div>

      <DayEventDialog
        day={selectedDay}
        entries={entries}
        open={dayDialogOpen}
        onOpenChange={setDayDialogOpen}
      />
    </div>
  );
}
