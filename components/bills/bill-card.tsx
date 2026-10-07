"use client";

import Link from "next/link";
import { EntityEditButton } from "@/components/shared/entity-edit-button";
import { CalendarClock, CreditCard, ReceiptText, Repeat } from "lucide-react";
import { motion } from "framer-motion";

import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import type { MemberWithUser } from "@/components/shared/member-display";
import { MemberDisplay } from "@/components/shared/member-display";
import { formatCurrency } from "@/lib/formatters";
import { formatDate, isOverdue } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { BillStatusBadge } from "./bill-status-badge";
import { BillPriorityBadge } from "./bill-priority-badge";

export function BillCard({
  bill,
  owner,
  onMarkPaid,
  compact = false,
}: {
  bill: Doc<"bills">;
  owner?: MemberWithUser | null;
  onMarkPaid?: (bill: Doc<"bills">) => void;
  compact?: boolean;
}) {
  const overdue =
    isOverdue(bill.dueAt) && !["paid", "cancelled"].includes(bill.status);
  const isSubscription =
    bill.status !== "cancelled" && (bill.autopay || bill.recurrenceRuleId);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}

      className={cn(
        "min-w-0 rounded-xl border border-border bg-card p-4 transition-colors shadow-[0_12px_32px_rgba(25,25,25,0.04)]",
        overdue
          ? "border-destructive/25 bg-destructive/10"
          : "hover:border-foreground/14 hover:bg-muted/45 dark:bg-white/[0.04] dark:hover:border-white/[0.13] dark:hover:bg-white/[0.06]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <EntityEditButton
          entity={{ kind: "bill", value: bill }}
          href={`/bills/${bill._id}`}
        >
          <div className="flex items-center gap-2">
            <ReceiptText className="size-4 shrink-0 text-muted-foreground" />
            <h3 className="min-w-0 flex-1 truncate font-semibold text-foreground">
              {bill.title}
            </h3>
          </div>
          {!compact && bill.provider && (
            <p className="mt-1 text-sm text-muted-foreground">
              {bill.provider}
            </p>
          )}
          {!compact && owner && (
            <MemberDisplay
              member={owner}
              detail="Owner"
              className="mt-3"
              avatarClassName="size-6"
            />
          )}
        </EntityEditButton>
        {onMarkPaid &&
          bill.status !== "paid" &&
          bill.status !== "cancelled" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMarkPaid(bill)}
            >
              Pay
            </Button>
          )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          href={`/bills/${bill._id}`}
          className="ml-auto rounded-lg px-2 py-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2"
        >
          Details
        </Link>
        <BillStatusBadge status={bill.status} />
        <BillPriorityBadge priority={bill.priority} />
        {isSubscription && (
          <span className="inline-flex items-center gap-1 rounded-full border border-info/30 bg-info/10 px-2 py-0.5 text-xs text-info">
            <CreditCard className="size-3" />
            Subscription
          </span>
        )}
        {bill.amountExpected !== undefined && (
          <span className="rounded-full border border-border bg-muted/45 px-2 py-0.5 text-sm font-semibold tabular-nums text-foreground dark:bg-white/[0.035]">
            {formatCurrency(bill.amountExpected, bill.currency)}
          </span>
        )}
        {(bill.status === "paid" || bill.dueAt !== undefined) && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
              overdue
                ? "border-destructive/20 bg-destructive/10 text-destructive"
                : "border-border bg-muted/45 text-muted-foreground dark:bg-white/[0.035]",
            )}
          >
            <CalendarClock className="size-3" />
            {bill.status === "paid"
              ? bill.paidAt !== undefined
                ? `Paid ${formatDate(bill.paidAt)}`
                : "Payment date unknown"
              : `Due ${formatDate(bill.dueAt)}`}
          </span>
        )}
        {bill.autopay && (
          <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs text-accent">
            Autopay
          </span>
        )}
        {bill.recurrenceRuleId && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/45 px-2 py-0.5 text-xs text-muted-foreground dark:bg-white/[0.035]">
            <Repeat className="size-3" />
            Recurring
          </span>
        )}
      </div>
    </motion.div>
  );
}
