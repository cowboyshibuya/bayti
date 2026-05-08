"use client";

import Link from "next/link";
import { CalendarClock, CheckCircle2, Circle } from "lucide-react";
import { motion } from "framer-motion";


import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { formatDate, isOverdue } from "@/lib/dates";
import { toTitleLabel } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { TaskPriorityBadge } from "./task-priority-badge";
import { TaskStatusBadge } from "./task-status-badge";

export function TaskCard({
  task,
  onMarkDone,
  compact = false,
}: {
  task: Doc<"tasks">;
  onMarkDone?: (task: Doc<"tasks">) => void;
  compact?: boolean;
}) {
  const overdue = isOverdue(task.dueAt) && !["done", "cancelled"].includes(task.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ y: -1, boxShadow: "var(--shadow-card)" }}
      className={cn(
        "rounded-2xl border border-border bg-card/80 p-4 transition-colors shadow-[0_12px_32px_rgba(25,25,25,0.04)]",
        overdue
          ? "border-destructive/25 bg-destructive/10"
          : "hover:border-foreground/14 hover:bg-muted/45 dark:bg-white/[0.04] dark:hover:border-white/[0.13] dark:hover:bg-white/[0.06]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Link href={`/tasks/${task._id}`} className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {task.status === "done" ? (
              <CheckCircle2 className="size-4 shrink-0 text-success" />
            ) : (
              <Circle className="size-4 shrink-0 text-muted-foreground" />
            )}
            <h3
              className={cn(
                "truncate font-semibold text-foreground/88",
                task.status === "done" && "text-foreground/36 line-through",
              )}
            >
              {task.title}
            </h3>
          </div>
          {!compact && task.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-foreground/42">
              {task.description}
            </p>
          )}
        </Link>
        {onMarkDone && task.status !== "done" && task.status !== "cancelled" && (
          <Button size="sm" variant="outline" onClick={() => onMarkDone(task)}>
            Done
          </Button>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <TaskStatusBadge status={task.status} />
        <TaskPriorityBadge priority={task.priority} />
        <span className="rounded-full border border-border bg-muted/45 px-2 py-0.5 text-xs text-foreground/42 dark:bg-white/[0.035]">
          {toTitleLabel(task.taskType)}
        </span>
        {task.dueAt && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
              overdue
                ? "border-destructive/20 bg-destructive/10 text-destructive"
                : "border-border bg-muted/45 text-foreground/42 dark:bg-white/[0.035]",
            )}
          >
            <CalendarClock className="size-3" />
            {formatDate(task.dueAt)}
          </span>
        )}
      </div>
    </motion.div>
  );
}
