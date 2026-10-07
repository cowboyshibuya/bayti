"use client";

import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { LoadingState } from "@/components/shared/loading-state";
import {
  BillForm,
  type BillFormSubmitValues,
} from "@/components/bills/bill-form";
import { BillList } from "@/components/bills/bill-list";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHousehold } from "@/lib/household-context";

const billViews = [
  { value: "upcoming", label: "Upcoming" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "all", label: "All" },
  { value: "mine", label: "Mine" },
] as const;

type BillView = (typeof billViews)[number]["value"];

export default function BillsPage() {
  const { household } = useHousehold();
  const householdId = household?._id;
  const members = useQuery(
    api.members.listAssignable,
    householdId ? { householdId } : "skip",
  );
  const createBill = useMutation(api.bills.create);
  const markPaid = useMutation(api.bills.markPaid);

  if (!householdId || members === undefined) {
    return <LoadingState label="Loading bills" />;
  }

  const currentHouseholdId = householdId;

  async function handleCreate(values: BillFormSubmitValues) {
    await createBill({
      householdId: currentHouseholdId,
      title: values.title,
      description: values.description,
      provider: values.provider,
      amountExpected: values.amountExpected,
      currency: values.currency,
      paidAt: values.paidAt,
      dueAt: values.dueAt,
      status: values.status,
      priority: values.priority,
      ownerUserId: values.ownerUserId,
      autopay: values.autopay,
      recurrence: values.recurrence ?? undefined,
    });
  }

  async function handleMarkPaid(bill: Doc<"bills">) {
    await markPaid({ householdId: currentHouseholdId, billId: bill._id });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{household?.name}</p>
          <h1 className="text-2xl font-semibold">Bills</h1>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Add bill
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add bill</DialogTitle>
              <DialogDescription>
                Add a provider, amount, due date, priority, and household
                context.
              </DialogDescription>
            </DialogHeader>
            <BillForm
              members={members}
              submitLabel="Add bill"
              onSubmit={handleCreate}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="upcoming" className="mt-6 grid gap-4">
        <TabsList className="h-auto flex-wrap justify-start">
          {billViews.map((view) => (
            <TabsTrigger key={view.value} value={view.value}>
              {view.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {billViews.map((view) => (
          <TabsContent key={view.value} value={view.value}>
            <BillViewPanel
              view={view.value}
              householdId={currentHouseholdId}
              members={members}
              onMarkPaid={handleMarkPaid}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function BillViewPanel({
  view,
  householdId,
  members,
  onMarkPaid,
}: {
  view: BillView;
  householdId: Id<"households">;
  members: { membership: Doc<"householdMembers">; user: Doc<"users"> | null }[];
  onMarkPaid: (bill: Doc<"bills">) => void;
}) {
  const bills = useQuery(api.bills.list, {
    householdId,
    view,
  });

  if (bills === undefined) {
    return (
      <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        Loading {view} bills...
      </p>
    );
  }

  return (
    <BillList
      bills={bills}
      dateMode={view === "paid" ? "paid" : "due"}
      emptyTitle={`No ${view} bills`}
      emptyDescription={
        view === "subscriptions"
          ? "Mark a bill as autopay or recurring to track subscriptions."
          : "Add a bill to start tracking household payments."
      }
      members={members}
      onMarkPaid={onMarkPaid}
    />
  );
}
