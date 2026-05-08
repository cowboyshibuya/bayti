"use client";

import { motion } from "framer-motion";
import { CalendarClock, ReceiptText, AlertTriangle } from "lucide-react";

import { formatCurrency } from "@/lib/formatters";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function ProjectionsPanel({
  projections,
}: {
  projections: {
    monthLabel: string;
    year: number;
    month: number;
    upcomingBills: {
      title: string;
      amountExpected?: number;
      currency: string;
      dueAt: number;
      status: string;
      isProjected: boolean;
    }[];
    projectedTotal: number;
    actualTotal: number;
  }[];
}) {
  if (projections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        No upcoming projections available.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {projections.map((month, mIndex) => (
        <motion.div
          key={`${month.year}-${month.month}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: mIndex * 0.06 }}
          className="rounded-xl border bg-card p-4 [box-shadow:var(--shadow-card)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              {month.monthLabel} {month.year}
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">
                {month.upcomingBills.length} bills
              </span>
              {month.projectedTotal > 0 && (
                <span className="font-medium text-warning">
                  {formatCurrency(month.projectedTotal)}
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            {month.upcomingBills.map((bill, bIndex) => (
              <div
                key={`${bill.title}-${bIndex}`}
                className={cn(
                  "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
                  bill.isProjected
                    ? "border-dashed border-muted bg-muted/20"
                    : "bg-card",
                )}
              >
                <div className="flex items-center gap-2">
                  {bill.isProjected ? (
                    <AlertTriangle className="size-3.5 text-muted-foreground" />
                  ) : (
                    <ReceiptText className="size-3.5 text-muted-foreground" />
                  )}
                  <span className={cn(bill.isProjected && "text-muted-foreground")}>
                    {bill.title}
                  </span>
                  {bill.isProjected && (
                    <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                      Projected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <CalendarClock className="size-3" />
                    {formatDate(bill.dueAt)}
                  </span>
                  {bill.amountExpected !== undefined ? (
                    <span className="font-medium">
                      {formatCurrency(bill.amountExpected, bill.currency)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
