"use client";

import { EntityCollection } from "@/components/shared/entity-collection";
import { WalletCards } from "lucide-react";

import { Doc } from "@/convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/empty-state";
import { ExpenseCard } from "./expense-card";

export function ExpenseList({
  expenses,
  emptyTitle = "No expenses found",
  emptyDescription = "Log an expense to start tracking household spending.",
  onRemove,
}: {
  expenses: Doc<"expenses">[];
  emptyTitle?: string;
  emptyDescription?: string;
  onRemove?: (expense: Doc<"expenses">) => void;
}) {
  return (
    <EntityCollection
      items={expenses}
      date={(item) => item.spentAt}
      defaultDescending={true}
      amount
    >
      {(visible) =>
        visible.length === 0 ? (
          <EmptyState
            icon={WalletCards}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <div className="grid gap-3">
            {visible.map((expense) => (
              <ExpenseCard
                key={expense._id}
                expense={expense}
                onRemove={onRemove}
              />
            ))}
          </div>
        )
      }
    </EntityCollection>
  );
}
