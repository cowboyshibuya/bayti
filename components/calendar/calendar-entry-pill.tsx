"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarDays,
  CheckSquare,
  Clock,
  ReceiptText,
} from "lucide-react";

import type { CalendarEntry } from "./types";
import { formatDate, formatEventDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

const typeConfig = {
  task: {
    icon: CheckSquare,
    label: "Task",
    pillClass:
      "bg-accent/15 text-accent border-accent/20 hover:bg-accent/25",
    dotClass: "bg-accent",
  },
  bill: {
    icon: ReceiptText,
    label: "Bill",
    pillClass:
      "bg-warning/15 text-warning border-warning/20 hover:bg-warning/25",
    dotClass: "bg-warning",
  },
  event: {
    icon: CalendarDays,
    label: "Event",
    pillClass: "bg-info/15 text-info border-info/20 hover:bg-info/25",
    dotClass: "bg-info",
  },
};

export function CalendarEntryPill({
  entry,
  className,
}: {
  entry: CalendarEntry;
  className?: string;
}) {
  const config = typeConfig[entry.entityType];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
        config.pillClass,
        entry.status === "done" || entry.status === "paid"
          ? "opacity-60"
          : "",
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", config.dotClass)} />
      <span className="truncate">{entry.title}</span>
    </span>
  );
}

type CalendarEntryCardClickBehavior = "none" | "event-detail";

export function CalendarEntryCard({
  entry,
  clickBehavior = "none",
}: {
  entry: CalendarEntry;
  clickBehavior?: CalendarEntryCardClickBehavior;
}) {
  const config = typeConfig[entry.entityType];
  const Icon = config.icon;
  const router = useRouter();
  const isClickable = clickBehavior === "event-detail" && entry.entityType === "event";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={cn(
        "rounded-2xl border border-border bg-card/80 p-3 shadow-[0_10px_26px_rgba(25,25,25,0.04)] transition-colors dark:bg-white/[0.04]",
        isClickable &&
          "cursor-pointer hover:border-foreground/14 hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:border-white/[0.13] dark:hover:bg-white/[0.06]",
      )}
      onClick={(event) => {
        if (!isClickable) return;
        event.stopPropagation();
        router.push(entry.link);
      }}
      onKeyDown={(event) => {
        if (!isClickable || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        event.stopPropagation();
        router.push(entry.link);
      }}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
            entry.entityType === "task" && "bg-accent/15 text-accent",
            entry.entityType === "bill" && "bg-warning/15 text-warning",
            entry.entityType === "event" && "bg-info/15 text-info",
          )}
        >
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground/88">{entry.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-foreground/42">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {entry.entityType === "event"
                ? formatEventDateTime({
                    startsAt: entry.date,
                    endsAt: entry.endDate,
                    isAllDay: entry.isAllDay,
                  })
                : formatDate(entry.date)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
