"use client";

import Link from "next/link";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  ReceiptText,
  X,
} from "lucide-react";
import { motion } from "framer-motion";

import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type InboxItem = {
  id: string;
  kind: "task" | "bill" | "event" | "document" | "reminder";
  entityType: "task" | "bill" | "event" | "document" | "manual";
  entityId: string | null;
  reminderId: Id<"reminders"> | null;
  title: string;
  description: string | null;
  dueAt: number;
  severity: "overdue" | "today" | "due_soon" | "upcoming";
  status: string;
  href: string;
  ownerUserId: Id<"users"> | null;
  targetUserId: Id<"users"> | null;
  user: Doc<"users"> | null;
};

const iconByKind = {
  task: CheckCircle2,
  bill: ReceiptText,
  event: CalendarDays,
  document: FileText,
  reminder: Bell,
};

const labelBySeverity = {
  overdue: "Overdue",
  today: "Today",
  due_soon: "Due soon",
  upcoming: "Upcoming",
};

export function InboxItemCard({
  item,
  compact = false,
  onMarkDone,
  onMarkPaid,
  onDismissReminder,
  onCancelReminder,
  onEditReminder,
}: {
  item: InboxItem;
  compact?: boolean;
  onMarkDone?: (taskId: Id<"tasks">) => void;
  onMarkPaid?: (billId: Id<"bills">) => void;
  onDismissReminder?: (reminderId: Id<"reminders">) => void;
  onCancelReminder?: (reminderId: Id<"reminders">) => void;
  onEditReminder?: (item: InboxItem) => void;
}) {
  const Icon = iconByKind[item.kind];
  const isOverdue = item.severity === "overdue";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border bg-card/88 p-4 shadow-[0_12px_32px_rgba(25,25,25,0.04)] transition-colors",
        isOverdue
          ? "border-destructive/25 bg-destructive/10"
          : "border-border hover:border-foreground/14 hover:bg-muted/45 dark:bg-white/[0.04] dark:hover:border-white/[0.13] dark:hover:bg-white/[0.06]",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-2xl",
            isOverdue
              ? "bg-destructive/12 text-destructive"
              : "bg-muted text-foreground/54 dark:bg-white/[0.06]",
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <Link href={item.href} className="min-w-0">
              <p className="truncate font-semibold text-foreground/88">
                {item.title}
              </p>
              {!compact && item.description && (
                <p className="mt-1 line-clamp-2 text-sm text-foreground/42">
                  {item.description}
                </p>
              )}
            </Link>
            {item.user && (
              <UserAvatar
                name={item.user.name}
                imageUrl={item.user.image}
                className="size-7"
              />
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs font-medium",
                isOverdue
                  ? "border-destructive/20 bg-destructive/10 text-destructive"
                  : item.severity === "today"
                    ? "border-accent/20 bg-accent/10 text-accent"
                    : "border-border bg-muted/45 text-foreground/42 dark:bg-white/[0.035]",
              )}
            >
              {labelBySeverity[item.severity]}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/45 px-2 py-0.5 text-xs text-foreground/42 dark:bg-white/[0.035]">
              <Clock className="size-3" />
              {formatDateTime(item.dueAt)}
            </span>
            <span className="rounded-full border border-border bg-muted/45 px-2 py-0.5 text-xs text-foreground/42 capitalize dark:bg-white/[0.035]">
              {item.kind}
            </span>
          </div>
        </div>
      </div>
      {!compact && (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {item.kind === "task" && item.entityId && onMarkDone && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMarkDone(item.entityId as Id<"tasks">)}
            >
              Done
            </Button>
          )}
          {item.kind === "bill" && item.entityId && onMarkPaid && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMarkPaid(item.entityId as Id<"bills">)}
            >
              Pay
            </Button>
          )}
          {item.kind === "reminder" && item.reminderId && onEditReminder && (
            <Button size="sm" variant="outline" onClick={() => onEditReminder(item)}>
              Edit
            </Button>
          )}
          {item.kind === "reminder" && item.reminderId && onDismissReminder && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onDismissReminder(item.reminderId!)}
            >
              Dismiss
            </Button>
          )}
          {item.kind === "reminder" && item.reminderId && onCancelReminder && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => onCancelReminder(item.reminderId!)}
              aria-label="Cancel reminder"
            >
              <X className="size-4" />
            </Button>
          )}
          <Button size="sm" asChild>
            <Link href={item.href}>Open</Link>
          </Button>
        </div>
      )}
    </motion.div>
  );
}
