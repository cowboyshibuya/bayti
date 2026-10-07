"use client";

import {
  EntityForm,
  useSavedForm,
  OptionalFields,
} from "@/components/shared/entity-form";

import { FormEvent, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { useHousehold } from "@/lib/household-context";
import { Doc, Id } from "@/convex/_generated/dataModel";
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
import { DatePicker } from "@/components/shared/date-picker";
import { MemberDisplay } from "@/components/shared/member-display";
import {
  BILL_STATUSES,
  DEFAULT_CURRENCY,
  RECURRENCE_FREQUENCIES,
  TASK_PRIORITIES,
} from "@/lib/constants";
import { toTitleLabel } from "@/lib/formatters";
import { formatDateInputValue, parseLocalDate } from "@/lib/dates";
import { billFormSchema } from "@/lib/validations";

export type BillFormSubmitValues = {
  title: string;
  description?: string;
  provider?: string;
  amountExpected?: number;
  currency: string;
  dueAt?: number;
  paidAt?: number;
  status: Doc<"bills">["status"];
  priority: Doc<"bills">["priority"];
  ownerUserId?: Id<"users">;
  autopay: boolean;
  recurrence?: {
    frequency: Doc<"recurrenceRules">["frequency"];
    interval: number;
    startsAt: number;
    endsAt?: number;
  } | null;
};

export function BillForm({
  members,
  initialBill,
  defaultDate,
  initialRecurrence,
  submitLabel,
  onSubmit,
}: {
  members: { membership: Doc<"householdMembers">; user: Doc<"users"> | null }[];
  initialBill?: Doc<"bills">;
  initialRecurrence?: Doc<"recurrenceRules"> | null;
  defaultDate?: number;
  submitLabel: string;
  onSubmit: (values: BillFormSubmitValues) => Promise<void>;
}) {
  const saved = useSavedForm();
  const [title, setTitle] = useState(initialBill?.title ?? "");
  const [description, setDescription] = useState(
    initialBill?.description ?? "",
  );
  const [provider, setProvider] = useState(initialBill?.provider ?? "");
  const [amountExpected, setAmountExpected] = useState<string>(
    initialBill?.amountExpected?.toString() ?? "",
  );
  const { household } = useHousehold();
  const currency =
    initialBill?.currency ?? household?.currency ?? DEFAULT_CURRENCY;
  const [status, setStatus] = useState<Doc<"bills">["status"]>(
    initialBill?.status ?? "upcoming",
  );
  const [paidDate, setPaidDate] = useState(
    formatDateInputValue(initialBill?.paidAt),
  );
  const [priority, setPriority] = useState<Doc<"bills">["priority"]>(
    initialBill?.priority ?? "medium",
  );
  const [ownerUserId, setOwnerUserId] = useState<string>(
    initialBill?.ownerUserId ?? "unassigned",
  );
  const [dueDate, setDueDate] = useState(
    formatDateInputValue(initialBill?.dueAt ?? defaultDate),
  );
  const [autopay, setAutopay] = useState(initialBill?.autopay ?? false);
  const [recurring, setRecurring] = useState(Boolean(initialRecurrence));
  const [frequency, setFrequency] = useState<
    Doc<"recurrenceRules">["frequency"]
  >(initialRecurrence?.frequency ?? "monthly");
  const [interval, setInterval] = useState(initialRecurrence?.interval ?? 1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberOptions = useMemo(
    () =>
      members.filter(
        (member): member is typeof member & { user: Doc<"users"> } =>
          Boolean(member.user),
      ),
    [members],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
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

    const dueAt = parseLocalDate(dueDate);

    if (recurring && !dueAt) {
      setError("Recurring bills need a due date.");
      setPending(false);
      return;
    }

    if (
      status === "paid" &&
      paidDate &&
      parseLocalDate(paidDate) === undefined
    ) {
      setError("Choose a valid payment date.");
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
        paidAt:
          status === "paid"
            ? (parseLocalDate(paidDate) ??
              (initialBill?.status === "paid"
                ? initialBill.paidAt
                : Date.now()))
            : undefined,
        status,
        priority,
        ownerUserId:
          ownerUserId === "unassigned"
            ? undefined
            : (ownerUserId as Id<"users">),
        autopay: parsed.data.autopay,
        recurrence: recurring
          ? {
              frequency,
              interval,
              startsAt: initialRecurrence?.startsAt ?? dueAt!,
              endsAt: initialRecurrence?.endsAt,
            }
          : initialBill
            ? null
            : undefined,
      });
      saved();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save bill.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <EntityForm onSubmit={handleSubmit} pending={pending} error={error}>
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

      <div className="grid gap-4">
        <div className="grid gap-2">
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
      </div>

      {status === "paid" && (
        <div className="grid gap-2">
          <Label htmlFor="bill-paid-date">Paid on</Label>
          <DatePicker
            id="bill-paid-date"
            value={paidDate}
            onChange={setPaidDate}
            placeholder={
              initialBill?.status === "paid" ? "Payment date unknown" : "Today"
            }
            allowClear={false}
          />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="bill-due-date">Due date</Label>
          <DatePicker
            id="bill-due-date"
            value={dueDate}
            onChange={setDueDate}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="bill-status">Status</Label>
          <Select
            value={status}
            onValueChange={(value) =>
              setStatus(value as Doc<"bills">["status"])
            }
          >
            <SelectTrigger id="bill-status">
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
          <Label htmlFor="bill-priority">Priority</Label>
          <Select
            value={priority}
            onValueChange={(value) =>
              setPriority(value as Doc<"bills">["priority"])
            }
          >
            <SelectTrigger id="bill-priority">
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
          <Label htmlFor="bill-owner">Owner</Label>
          <Select value={ownerUserId} onValueChange={setOwnerUserId}>
            <SelectTrigger id="bill-owner">
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
              <Label htmlFor="bill-frequency">Frequency</Label>
              <Select
                value={frequency}
                onValueChange={(value) =>
                  setFrequency(value as Doc<"recurrenceRules">["frequency"])
                }
              >
                <SelectTrigger id="bill-frequency">
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
              <Label htmlFor="bill-interval">Interval</Label>
              <Input
                id="bill-interval"
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

      <OptionalFields>
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
      </OptionalFields>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {submitLabel}
      </Button>
    </EntityForm>
  );
}
