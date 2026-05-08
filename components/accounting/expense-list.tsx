"use client";

import { motion } from "framer-motion";
import { WalletCards } from "lucide-react";

import type { Doc } from "../../../convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/empty-state";
import { ExpenseCard } from "./expense-card";

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

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
  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={WalletCards}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <motion.div
      className="grid gap-3"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {expenses.map((expense) => (
        <ExpenseCard key={expense._id} expense={expense} onRemove={onRemove} />
      ))}
    </motion.div>
  );
}
