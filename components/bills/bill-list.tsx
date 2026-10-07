"use client";

import { EntityCollection } from "@/components/shared/entity-collection";
import { ReceiptText } from "lucide-react";

import type { Doc } from "@/convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/empty-state";
import type { MemberWithUser } from "@/components/shared/member-display";
import { findMemberByUserId } from "@/components/shared/member-display";
import { BillCard } from "./bill-card";

export function BillList({
  bills,
  dateMode = "due",
  emptyTitle = "No bills found",
  emptyDescription = "Create a bill to start tracking household payments.",
  members = [],
  onMarkPaid,
}: {
  bills: Doc<"bills">[];
  dateMode?: "due" | "paid";
  emptyTitle?: string;
  emptyDescription?: string;
  members?: MemberWithUser[];
  onMarkPaid?: (bill: Doc<"bills">) => void;
}) {
  return (
    <EntityCollection
      items={bills}
      date={(item) => (dateMode === "paid" ? item.paidAt : item.dueAt)}
      dateLabel={dateMode === "paid" ? "Paid on" : "Due date"}
      defaultDescending={dateMode === "paid"}
      amount
    >
      {(visible) =>
        visible.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <div className="grid gap-3">
            {visible.map((bill) => (
              <BillCard
                key={bill._id}
                bill={bill}
                owner={findMemberByUserId(members, bill.ownerUserId)}
                onMarkPaid={onMarkPaid}
              />
            ))}
          </div>
        )
      }
    </EntityCollection>
  );
}
