"use client";

import { use, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, CalendarClock, CreditCard, ReceiptText, Repeat } from "lucide-react";
import Link from "next/link";


import { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { RecentActivityPanel } from "@/components/dashboard/recent-activity-panel";
import { LoadingState } from "@/components/shared/loading-state";
import { MemberDisplay, findMemberByUserId } from "@/components/shared/member-display";
import { BillForm, type BillFormSubmitValues } from "@/components/bills/bill-form";
import { BillStatusBadge } from "@/components/bills/bill-status-badge";
import { BillPriorityBadge } from "@/components/bills/bill-priority-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BILL_STATUSES } from "@/lib/constants";
import { formatCurrency } from "@/lib/formatters";
import { formatDate, formatDateTime } from "@/lib/dates";
import { toTitleLabel } from "@/lib/formatters";
import { useHousehold } from "@/lib/household-context";

export default function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { household } = useHousehold();
  const householdId = household?._id;
  const billDetails = useQuery(
    api.bills.getDetails,
    householdId ? { householdId, billId: id as Id<"bills"> } : "skip",
  );
  const members = useQuery(
    api.members.listAssignable,
    householdId ? { householdId } : "skip",
  );
  const activity = useQuery(
    api.activity.listForEntity,
    householdId
      ? { householdId, entityType: "bill", entityId: id }
      : "skip",
  );
  const updateBill = useMutation(api.bills.update);
  const updateStatus = useMutation(api.bills.updateStatus);
  const markPaid = useMutation(api.bills.markPaid);
  const cancelBill = useMutation(api.bills.cancel);
  const [editOpen, setEditOpen] = useState(false);

  if (!householdId || billDetails === undefined || members === undefined) {
    return <LoadingState label="Loading bill" />;
  }

  const bill = billDetails.bill;
  const recurrence = billDetails.recurrence;
  const owner = findMemberByUserId(members, bill.ownerUserId);
  const isSubscription = bill.status !== "cancelled" && (bill.autopay || bill.recurrenceRuleId);

  async function handleUpdate(values: BillFormSubmitValues) {
    if (!householdId || !bill) {
      return;
    }

    await updateBill({
      householdId,
      billId: bill._id,
      title: values.title,
      description: values.description,
      provider: values.provider,
      amountExpected: values.amountExpected,
      currency: values.currency,
      dueAt: values.dueAt ?? null,
      priority: values.priority,
      ownerUserId: values.ownerUserId ?? null,
      autopay: values.autopay,
      recurrence: values.recurrence,
    });
    await updateStatus({ householdId, billId: bill._id, status: values.status });
    setEditOpen(false);
  }

  async function handleStatusChange(status: Doc<"bills">["status"]) {
    if (!householdId || !bill) {
      return;
    }

    await updateStatus({ householdId, billId: bill._id, status });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div>
        <Button variant="ghost" asChild className="-ml-2 mb-4">
          <Link href="/bills">
            <ArrowLeft className="size-4" />
            Back to bills
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <BillStatusBadge status={bill.status} />
              <BillPriorityBadge priority={bill.priority} />
              {bill.autopay && (
                <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs text-accent">
                  Autopay
                </span>
              )}
              {isSubscription && (
                <span className="inline-flex items-center gap-1 rounded-full border border-info/30 bg-info/10 px-2 py-0.5 text-xs text-info">
                  <CreditCard className="size-3" />
                  Subscription
                </span>
              )}
              {bill.recurrenceRuleId && (
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                  <Repeat className="size-3" />
                  Recurring
                </span>
              )}
            </div>
            <h1 className="text-3xl font-semibold tracking-normal">{bill.title}</h1>
            {bill.description && (
              <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {bill.description}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Edit</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit bill</DialogTitle>
                  <DialogDescription>
                    Update amount, due date, priority, or bill details.
                  </DialogDescription>
                </DialogHeader>
                <BillForm
                  members={members}
                  initialBill={bill}
                  initialRecurrence={recurrence}
                  submitLabel="Save changes"
                  onSubmit={handleUpdate}
                />
              </DialogContent>
            </Dialog>
            {bill.status !== "paid" && bill.status !== "cancelled" && (
              <Button variant="accent" onClick={() => void markPaid({ householdId, billId: bill._id })}>
                Mark paid
              </Button>
            )}
            {bill.status !== "cancelled" && (
              <Button
                variant="outline"
                onClick={() => void cancelBill({ householdId, billId: bill._id })}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border bg-card p-5 [box-shadow:var(--shadow-card)]">
          <h2 className="font-semibold">Bill details</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailItem
              label="Amount expected"
              value={
                bill.amountExpected !== undefined
                  ? formatCurrency(bill.amountExpected, bill.currency)
                  : "Not set"
              }
              icon={ReceiptText}
            />
            <DetailItem label="Provider" value={bill.provider ?? "Not set"} />
            <DetailItem label="Due date" value={formatDate(bill.dueAt)} icon={CalendarClock} />
            <DetailItem
              label="Subscription"
              value={isSubscription ? "Tracked" : "Not tracked"}
              icon={CreditCard}
            />
            <DetailItem
              label="Recurrence"
              value={recurrence ? `${toTitleLabel(recurrence.frequency)} every ${recurrence.interval}` : "None"}
              icon={Repeat}
            />
            <DetailItem label="Created" value={formatDateTime(bill.createdAt)} />
            <DetailItem label="Updated" value={formatDateTime(bill.updatedAt)} />
            {bill.paidAt && (
              <DetailItem label="Paid on" value={formatDateTime(bill.paidAt)} />
            )}
          </div>
          <div className="mt-4 rounded-xl border p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">Owner</p>
            {owner ? (
              <MemberDisplay member={owner} detail={owner.user?.email ?? "No email"} className="mt-2" />
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Unassigned</p>
            )}
          </div>
          <div className="mt-6 grid gap-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={bill.status} onValueChange={(value) => void handleStatusChange(value as Doc<"bills">["status"])}>
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BILL_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {toTitleLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <RecentActivityPanel activity={activity ?? []} />
      </section>
    </div>
  );
}

function DetailItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border p-4 transition-colors hover:border-foreground/15">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 flex items-center gap-2 text-sm">
        {Icon && <Icon className="size-4 text-muted-foreground" />}
        {value}
      </p>
    </div>
  );
}
