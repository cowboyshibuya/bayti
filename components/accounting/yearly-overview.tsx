"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { useCurrencyFormatter } from "@/lib/use-currency-formatter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function YearlyOverview({
  data,
}: {
  data: {
    months: {
      month: number;
      label: string;
      billsPaid: number;
      billsExpected: number;
      expenses: number;
      total: number;
    }[];
    yearTotal: {
      billsPaid: number;
      billsExpected: number;
      expenses: number;
      grandTotal: number;
    };
  };
}) {
  const formatCurrency = useCurrencyFormatter();
  const [yearOffset, setYearOffset] = useState(0);
  const currentYear = new Date().getFullYear() + yearOffset;

  const maxTotal = Math.max(...data.months.map((m) => m.total), 1);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{currentYear}</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setYearOffset((y) => y - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setYearOffset((y) => y + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {data.months.map((month, index) => {
          const barHeight = maxTotal > 0 ? (month.total / maxTotal) * 100 : 0;
          const hasData = month.total > 0;

          return (
            <motion.div
              key={month.month}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                "rounded-xl border bg-card p-3 [box-shadow:var(--shadow-card)]",
                !hasData && "opacity-60",
              )}
            >
              <p className="text-xs font-medium text-muted-foreground">
                {month.label}
              </p>
              <p className="mt-1 text-lg font-semibold">
                {formatCurrency(month.total)}
              </p>
              <div className="mt-2 flex h-16 items-end gap-1">
                <div
                  className="w-1/3 rounded-t bg-success/60"
                  style={{
                    height: `${maxTotal > 0 ? (month.billsPaid / maxTotal) * 100 : 0}%`,
                  }}
                  title={`Paid: ${formatCurrency(month.billsPaid)}`}
                />
                <div
                  className="w-1/3 rounded-t bg-warning/60"
                  style={{
                    height: `${maxTotal > 0 ? (month.billsExpected / maxTotal) * 100 : 0}%`,
                  }}
                  title={`Expected: ${formatCurrency(month.billsExpected)}`}
                />
                <div
                  className="w-1/3 rounded-t bg-destructive/40"
                  style={{
                    height: `${maxTotal > 0 ? (month.expenses / maxTotal) * 100 : 0}%`,
                  }}
                  title={`Expenses: ${formatCurrency(month.expenses)}`}
                />
              </div>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="inline-block size-1.5 rounded-full bg-success/60" />
                Paid
                <span className="inline-block size-1.5 rounded-full bg-warning/60" />
                Expected
                <span className="inline-block size-1.5 rounded-full bg-destructive/40" />
                Spent
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border bg-card p-4 [box-shadow:var(--shadow-card)]">
        <p className="text-xs font-medium text-muted-foreground">Year total</p>
        <p className="mt-1 text-2xl font-semibold">
          {formatCurrency(data.yearTotal.grandTotal)}
        </p>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-lg bg-success/10 px-3 py-2">
            <span className="text-muted-foreground">Bills paid</span>
            <span className="font-medium">
              {formatCurrency(data.yearTotal.billsPaid)}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-warning/10 px-3 py-2">
            <span className="text-muted-foreground">Bills expected</span>
            <span className="font-medium">
              {formatCurrency(data.yearTotal.billsExpected)}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-destructive/10 px-3 py-2">
            <span className="text-muted-foreground">Expenses</span>
            <span className="font-medium">
              {formatCurrency(data.yearTotal.expenses)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
