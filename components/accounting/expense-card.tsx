"use client";

import { motion } from "framer-motion";
import { WalletCards, CalendarDays, Tag } from "lucide-react";

import { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import { formatDate } from "@/lib/dates";

export function ExpenseCard({
  expense,
  onRemove,
}: {
  expense: Doc<"expenses">;
  onRemove?: (expense: Doc<"expenses">) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ y: -1, boxShadow: "var(--shadow-card)" }}
      className="rounded-2xl border border-border bg-card/80 p-4 shadow-[0_12px_32px_rgba(25,25,25,0.04)] transition-colors hover:border-foreground/14 hover:bg-muted/45 dark:bg-white/[0.04] dark:hover:border-white/[0.13] dark:hover:bg-white/[0.06]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <WalletCards className="size-4 shrink-0 text-foreground/42" />
            <h3 className="truncate font-semibold text-foreground/88">{expense.title}</h3>
          </div>
          {expense.merchant && (
            <p className="mt-1 text-sm text-foreground/42">{expense.merchant}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-foreground/88">{formatCurrency(expense.amount, expense.currency)}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-foreground/56 dark:bg-white/[0.05]">
          <Tag className="size-3" />
          {expense.category}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/45 px-2 py-0.5 text-xs text-foreground/42 dark:bg-white/[0.035]">
          <CalendarDays className="size-3" />
          {formatDate(expense.spentAt)}
        </span>
        {expense.paymentMethod && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/45 px-2 py-0.5 text-xs text-foreground/42 dark:bg-white/[0.035]">
            {expense.paymentMethod}
          </span>
        )}
        {onRemove && (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-auto px-2 py-0.5 text-xs text-destructive hover:text-destructive"
            onClick={() => onRemove(expense)}
          >
            Remove
          </Button>
        )}
      </div>
    </motion.div>
  );
}
