"use client";

import { motion } from "framer-motion";

import { formatCurrency } from "@/lib/formatters";

const categoryColors: Record<string, string> = {
  Groceries: "bg-chart-1",
  Utilities: "bg-chart-2",
  "Rent/Mortgage": "bg-chart-3",
  Transport: "bg-chart-4",
  Education: "bg-chart-5",
  Health: "bg-accent",
  Household: "bg-primary",
  "Eating Out": "bg-warning",
  Subscriptions: "bg-info",
  Repairs: "bg-destructive",
  Insurance: "bg-secondary",
  Travel: "bg-success",
  Gifts: "bg-muted",
  Miscellaneous: "bg-border",
};

export function CategoryBreakdown({
  data,
}: {
  data: { category: string; amount: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        No expense data for this period.
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.amount, 0);
  const max = data[0]?.amount ?? 1;

  return (
    <div className="grid gap-3">
      {data.map((item, index) => {
        const pct = total > 0 ? (item.amount / total) * 100 : 0;
        const barWidth = max > 0 ? (item.amount / max) * 100 : 0;

        return (
          <motion.div
            key={item.category}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
            className="group"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{item.category}</span>
              <span className="text-muted-foreground">
                {formatCurrency(item.amount)}{" "}
                <span className="text-xs">({pct.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${barWidth}%` }}
                transition={{ duration: 0.5, delay: index * 0.04 }}
                className={`h-full rounded-full ${categoryColors[item.category] ?? "bg-primary"}`}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
