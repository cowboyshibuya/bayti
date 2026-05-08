"use client";

import { motion } from "framer-motion";
import { ReceiptText } from "lucide-react";

import type { Doc } from "@/convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/empty-state";
import type { MemberWithUser } from "@/components/shared/member-display";
import { findMemberByUserId } from "@/components/shared/member-display";
import { BillCard } from "./bill-card";

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

export function BillList({
  bills,
  emptyTitle = "No bills found",
  emptyDescription = "Create a bill to start tracking household payments.",
  members = [],
  onMarkPaid,
}: {
  bills: Doc<"bills">[];
  emptyTitle?: string;
  emptyDescription?: string;
  members?: MemberWithUser[];
  onMarkPaid?: (bill: Doc<"bills">) => void;
}) {
  if (bills.length === 0) {
    return (
      <EmptyState
        icon={ReceiptText}
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
      {bills.map((bill) => (
        <BillCard
          key={bill._id}
          bill={bill}
          owner={findMemberByUserId(members, bill.ownerUserId)}
          onMarkPaid={onMarkPaid}
        />
      ))}
    </motion.div>
  );
}
