"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { useCurrencyFormatter } from "@/lib/use-currency-formatter";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  amount,
  count,
  trend,
  trendLabel,
  variant = "neutral",
  delay = 0,
}: {
  label: string;
  amount: number;
  count?: number;
  trend?: number;
  trendLabel?: string;
  variant?: "positive" | "negative" | "neutral" | "warning";
  delay?: number;
}) {
  const formatCurrency = useCurrencyFormatter();
  const variantStyles = {
    positive: "bg-success/10 text-success border-success/20",
    negative: "bg-destructive/10 text-destructive border-destructive/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    neutral: "bg-card border-border",
  };

  const TrendIcon =
    trend === undefined || trend === 0
      ? Minus
      : trend > 0
        ? TrendingUp
        : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        "rounded-xl border p-4 [box-shadow:var(--shadow-card)]",
        variantStyles[variant],
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">
        {formatCurrency(amount)}
      </p>
      <div className="mt-2 flex items-center justify-between">
        {count !== undefined && (
          <span className="text-xs text-muted-foreground">{count} items</span>
        )}
        {trend !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              trend > 0
                ? "text-destructive"
                : trend < 0
                  ? "text-success"
                  : "text-muted-foreground",
            )}
          >
            <TrendIcon className="size-3" />
            {trend > 0 ? "+" : ""}
            {trend.toFixed(0)}%
            {trendLabel && (
              <span className="text-muted-foreground">{trendLabel}</span>
            )}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function OverviewStats({
  data,
}: {
  data: {
    billsPaid: { amount: number; count: number };
    billsExpected: { amount: number; count: number };
    billsOverdue: { amount: number; count: number };
    expenses: { amount: number; count: number };
    netOutflow: number;
    remaining: number;
    lastMonth: {
      billsPaid: number;
      billsExpected: number;
      expenses: number;
      netOutflow: number;
    };
  };
}) {
  const billsTrend =
    data.lastMonth.billsPaid + data.lastMonth.billsExpected > 0
      ? ((data.billsPaid.amount +
          data.billsExpected.amount -
          (data.lastMonth.billsPaid + data.lastMonth.billsExpected)) /
          (data.lastMonth.billsPaid + data.lastMonth.billsExpected)) *
        100
      : 0;

  const expenseTrend =
    data.lastMonth.expenses > 0
      ? ((data.expenses.amount - data.lastMonth.expenses) /
          data.lastMonth.expenses) *
        100
      : 0;

  const netTrend =
    data.lastMonth.netOutflow > 0
      ? ((data.netOutflow - data.lastMonth.netOutflow) /
          data.lastMonth.netOutflow) *
        100
      : 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Bills paid this month"
        amount={data.billsPaid.amount}
        count={data.billsPaid.count}
        trend={billsTrend}
        trendLabel=" vs last month"
        variant="positive"
        delay={0}
      />
      <StatCard
        label="Bills expected"
        amount={data.billsExpected.amount}
        count={data.billsExpected.count}
        variant="warning"
        delay={0.05}
      />
      <StatCard
        label="Expenses this month"
        amount={data.expenses.amount}
        count={data.expenses.count}
        trend={expenseTrend}
        trendLabel=" vs last month"
        variant="negative"
        delay={0.1}
      />
      <StatCard
        label="Net outflow"
        amount={data.netOutflow}
        trend={netTrend}
        trendLabel=" vs last month"
        variant="neutral"
        delay={0.15}
      />
    </div>
  );
}
