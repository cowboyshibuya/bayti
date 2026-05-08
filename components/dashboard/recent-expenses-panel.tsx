"use client";

import { useQuery } from "convex/react";
import { WalletCards } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/formatters";
import { formatDate } from "@/lib/dates";
import { useHousehold } from "@/lib/household-context";
import { PanelShell } from "./panel-shell";

export function RecentExpensesPanel() {
  const { household } = useHousehold();
  const householdId = household?._id;
  const expenseDashboard = useQuery(
    api.expenses.dashboard,
    householdId ? { householdId } : "skip",
  );

  if (expenseDashboard === undefined) {
    return (
      <PanelShell title="Recent expenses" description="Latest household spending.">
        <p className="text-sm text-foreground/42">Loading...</p>
      </PanelShell>
    );
  }

  if (expenseDashboard.recentExpenses.length === 0) {
    return (
      <PanelShell title="Recent expenses" description="Latest household spending.">
        <EmptyState
          icon={WalletCards}
          title="No expenses logged"
          description="Log expenses in Accounting to track household spending."
        />
      </PanelShell>
    );
  }

  return (
    <PanelShell title="Recent expenses" description="Latest household spending.">
      <div className="grid gap-3">
        {expenseDashboard.recentExpenses.map((expense) => (
          <div
            key={expense._id}
            className="flex items-center justify-between rounded-2xl border border-border bg-card/80 px-3 py-2 text-sm dark:bg-white/[0.04]"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground/88">{expense.title}</p>
              <p className="text-xs text-foreground/40">
                {expense.category} · {formatDate(expense.spentAt)}
              </p>
            </div>
            <span className="shrink-0 font-semibold text-foreground/86">
              {formatCurrency(expense.amount, expense.currency)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-border pt-2 text-xs text-foreground/42">
        {expenseDashboard.countThisMonth} this month ·{" "}
        {formatCurrency(expenseDashboard.totalThisMonth)}
      </div>
    </PanelShell>
  );
}
