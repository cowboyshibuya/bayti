"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MemberDisplay } from "@/components/shared/member-display";
import {
  BILL_STATUSES,
  DEFAULT_CURRENCY,
  RECURRENCE_FREQUENCIES,
  TASK_PRIORITIES,
} from "@/lib/constants";
import { toTitleLabel } from "@/lib/formatters";
import { billFormSchema } from "@/lib/validations";

export type BillFormSubmitValues = {
  title: string;
  description?: string;
  provider?: string;
  amountExpected?: number;
  currency: string;
  dueAt?: number;
  status: Doc<"bills">["status"];
  priority: Doc<"bills">["priority"];
  ownerUserId?: Id<"users">;
  autopay: boolean;
  recurrence?: {
    frequency: Doc<"recurrenceRules">["frequency"];
    interval: number;
    startsAt: number;
  } | null;
};

export function BillForm({
  members,
  initialBill,
  initialRecurrence,
  submitLabel,
  onSubmit,
}: {
  members: { membership: Doc<"householdMembers">; user: Doc<"users"> | null }[];
  initialBill?: Doc<"bills">;
  initialRecurrence?: Doc<"recurrenceRules"> | null;
  submitLabel: string;
  onSubmit: (values: BillFormSubmitValues) => Promise<void>;
}) {
  const [title, setTitle] = useState(initialBill?.title ?? "");
  const [description, setDescription] = useState(initialBill?.description ?? "");
  const [provider, setProvider] = useState(initialBill?.provider ?? "");
  const [amountExpected, setAmountExpected] = useState<string>(
    initialBill?.amountExpected?.toString() ?? "",
  );
  const [currency, setCurrency] = useState(initialBill?.currency ?? DEFAULT_CURRENCY);
  const [status, setStatus] = useState<Doc<"bills">["status"]>(
    initialBill?.status ?? "upcoming",
  );
  const [priority, setPriority] = useState<Doc<"bills">["priority"]>(
    initialBill?.priority ?? "medium",
  );
  const [ownerUserId, setOwnerUserId] = useState<string>(
    initialBill?.ownerUserId ?? "unassigned",
  );
  const [dueDate, setDueDate] = useState(
    initialBill?.dueAt ? new Date(initialBill.dueAt).toISOString().slice(0, 10) : "",
  );
  const [autopay, setAutopay] = useState(initialBill?.autopay ?? false);
  const [recurring, setRecurring] = useState(Boolean(initialRecurrence));
  const [frequency, setFrequency] =
    useState<Doc<"recurrenceRules">["frequency"]>(initialRecurrence?.frequency ?? "monthly");
  const [interval, setInterval] = useState(initialRecurrence?.interval ?? 1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberOptions = useMemo(
    () =>
      members.filter((member): member is typeof member & { user: Doc<"users"> } =>
        Boolean(member.user),
      ),
    [members],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const parsed = billFormSchema.safeParse({
      title,
      description,
      provider,
      amountExpected: amountExpected ? Number(amountExpected) : undefined,
      currency,
      dueDate,
      status,
      priority,
      ownerUserId: ownerUserId === "unassigned" ? undefined : ownerUserId,
      autopay,
      recurring,
      frequency,
      interval,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the bill form.");
      setPending(false);
      return;
    }

    const dueAt = dueDate ? new Date(`${dueDate}T12:00:00`).getTime() : undefined;

    if (recurring && !dueAt) {
      setError("Recurring bills need a due date.");
      setPending(false);
      return;
    }

    try {
      await onSubmit({
        title: parsed.data.title,
        description: parsed.data.description,
        provider: parsed.data.provider,
        amountExpected: parsed.data.amountExpected,
        currency: parsed.data.currency,
        dueAt,
        status,
        priority,
        ownerUserId:
          ownerUserId === "unassigned" ? undefined : (ownerUserId as Id<"users">),
        autopay: parsed.data.autopay,
        recurrence: recurring
          ? {
              frequency,
              interval,
              startsAt: dueAt!,
            }
          : initialBill
            ? null
            : undefined,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save bill.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="bill-title">Title</Label>
        <Input
          id="bill-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Electricity bill"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bill-description">Description</Label>
        <Textarea
          id="bill-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Add details, account numbers, or notes."
          rows={2}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bill-provider">Provider</Label>
        <Input
          id="bill-provider"
          value={provider}
          onChange={(event) => setProvider(event.target.value)}
          placeholder="e.g. EDF, Vodafone, Insurance Co."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="bill-amount">Amount expected</Label>
          <Input
            id="bill-amount"
            type="number"
            min={0}
            step={0.01}
            value={amountExpected}
            onChange={(event) => setAmountExpected(event.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bill-currency">Currency</Label>
          <Input
            id="bill-currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            placeholder="EUR"
            maxLength={3}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Due date</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as Doc<"bills">["status"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BILL_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {toTitleLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(value) => setPriority(value as Doc<"bills">["priority"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map((value) => (
                <SelectItem key={value} value={value}>
                  {toTitleLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Owner</Label>
          <Select value={ownerUserId} onValueChange={setOwnerUserId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {memberOptions.map((member) => (
                <SelectItem key={member.user._id} value={member.user._id}>
                  <MemberDisplay
                    member={member}
                    detail={member.user.email}
                    avatarClassName="size-6"
                  />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <label className="flex items-center gap-3 text-sm font-medium">
          <Checkbox
            checked={autopay}
            onCheckedChange={(checked) => setAutopay(Boolean(checked))}
          />
          Autopay enabled
        </label>
      </div>

      <div className="rounded-xl border p-4">
        <label className="flex items-center gap-3 text-sm font-medium">
          <Checkbox
            checked={recurring}
            onCheckedChange={(checked) => setRecurring(Boolean(checked))}
          />
          Recurring bill
        </label>
        {recurring && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(value) => setFrequency(value as Doc<"recurrenceRules">["frequency"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_FREQUENCIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {toTitleLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Interval</Label>
              <Input
                type="number"
                min={1}
                max={24}
                value={interval}
                onChange={(event) => setInterval(Number(event.target.value))}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}
