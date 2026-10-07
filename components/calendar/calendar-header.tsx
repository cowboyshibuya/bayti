"use client";

import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from "date-fns";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarView = "month" | "week" | "day";

export function CalendarHeader({
  view,
  currentDate,
  onViewChange,
  onDateChange,
}: {
  view: CalendarView;
  currentDate: Date;
  onViewChange: (view: CalendarView) => void;
  onDateChange: (date: Date) => void;
}) {
  function goPrev() {
    if (view === "month") onDateChange(subMonths(currentDate, 1));
    else if (view === "week") onDateChange(subWeeks(currentDate, 1));
    else onDateChange(subDays(currentDate, 1));
  }

  function goNext() {
    if (view === "month") onDateChange(addMonths(currentDate, 1));
    else if (view === "week") onDateChange(addWeeks(currentDate, 1));
    else onDateChange(addDays(currentDate, 1));
  }

  function goToday() {
    onDateChange(new Date());
  }

  function label() {
    if (view === "month") return format(currentDate, "MMMM yyyy");
    if (view === "week") {
      const start = subDays(currentDate, currentDate.getDay());
      const end = addDays(start, 6);
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`;
      }
      if (start.getFullYear() === end.getFullYear()) {
        return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
      }
      return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
    }
    return format(currentDate, "EEEE, MMMM d, yyyy");
  }

  const views: { value: CalendarView; label: string }[] = [
    { value: "month", label: "Month" },
    { value: "week", label: "Week" },
    { value: "day", label: "Day" },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">Calendar</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={goToday}>
          <CalendarIcon className="mr-1 size-3.5" />
          Today
        </Button>
        <div className="flex items-center rounded-lg border">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous period"
            onClick={goPrev}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-0 max-w-[calc(100vw-8rem)] px-2 text-wrap text-center text-sm font-medium tabular-nums">
            {label()}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next period"
            onClick={goNext}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex rounded-lg border p-0.5">
          {views.map((v) => (
            <button
              key={v.value}
              onClick={() => onViewChange(v.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                view === v.value
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
