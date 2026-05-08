import { ReceiptText } from "lucide-react";

import type { Doc } from "../../../convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/empty-state";
import { BillCard } from "@/components/bills/bill-card";
import { PanelShell } from "./panel-shell";

export function UpcomingBillsPanel({ bills }: { bills: Doc<"bills">[] }) {
  return (
    <PanelShell title="Upcoming bills" description="Bills due soon.">
      {bills.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No upcoming bills"
          description="Bills due soon will appear here."
        />
      ) : (
        <div className="grid gap-3">
          {bills.map((bill) => (
            <BillCard key={bill._id} bill={bill} compact />
          ))}
        </div>
      )}
    </PanelShell>
  );
}
