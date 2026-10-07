"use client";

import {
  EntityForm,
  useSavedForm,
  OptionalFields,
} from "@/components/shared/entity-form";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";

import { useHousehold } from "@/lib/household-context";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
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
  DEFAULT_CURRENCY,
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
} from "@/lib/constants";
import { formatDateInputValue, parseLocalDate } from "@/lib/dates";

export type ExpenseFormSubmitValues = {
  title: string;
  merchant?: string;
  amount: number;
  currency: string;
  spentAt: number;
  category: ExpenseCategory;
  paymentMethod?: string;
  notes?: string;
  paidByUserId?: Id<"users">;
};

export function ExpenseForm({
  members,
  initialExpense,
  defaultDate,
  submitLabel,
  onSubmit,
}: {
  members: { membership: Doc<"householdMembers">; user: Doc<"users"> | null }[];
  initialExpense?: Doc<"expenses">;
  defaultDate?: number;
  submitLabel: string;
  onSubmit: (values: ExpenseFormSubmitValues) => Promise<void>;
}) {
  const saved = useSavedForm();
  const [title, setTitle] = useState(initialExpense?.title ?? "");
  const [merchant, setMerchant] = useState(initialExpense?.merchant ?? "");
  const [amount, setAmount] = useState<string>(
    initialExpense?.amount?.toString() ?? "",
  );
  const { household } = useHousehold();
  const currency =
    initialExpense?.currency ?? household?.currency ?? DEFAULT_CURRENCY;
  const [spentDate, setSpentDate] = useState(() =>
    formatDateInputValue(initialExpense?.spentAt ?? defaultDate ?? Date.now()),
  );
  const [category, setCategory] = useState<ExpenseCategory>(
    (initialExpense?.category as ExpenseCategory) ?? "Groceries",
  );
  const [paymentMethod, setPaymentMethod] = useState(
    initialExpense?.paymentMethod ?? "",
  );
  const [notes, setNotes] = useState(initialExpense?.notes ?? "");
  const [paidByUserId, setPaidByUserId] = useState<string>(
    initialExpense?.paidByUserId ?? "unassigned",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberOptions = members.filter(
    (m): m is typeof m & { user: Doc<"users"> } => Boolean(m.user),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    const parsedAmount = amount ? Number(amount) : NaN;
    if (!title.trim()) {
      setError("Title is required.");
      setPending(false);
      return;
    }
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      setError("Amount must be a positive number.");
      setPending(false);
      return;
    }

    const spentAt = parseLocalDate(spentDate);

    if (spentAt === undefined) {
      setError("Choose a valid expense date.");
      setPending(false);
      return;
    }

    try {
      await onSubmit({
        title: title.trim(),
        merchant: merchant.trim() || undefined,
        amount: parsedAmount,
        currency: currency.toUpperCase(),
        spentAt,
        category,
        paymentMethod: paymentMethod.trim() || undefined,
        notes: notes.trim() || undefined,
        paidByUserId:
          paidByUserId === "unassigned"
            ? undefined
            : (paidByUserId as Id<"users">),
      });
      saved();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save expense.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <EntityForm onSubmit={handleSubmit} pending={pending} error={error}>
      <div className="grid gap-2">
        <Label htmlFor="expense-title">Title</Label>
        <Input
          id="expense-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Grocery run"
          required
        />
      </div>

      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label htmlFor="expense-amount">Amount</Label>
          <Input
            id="expense-amount"
            type="number"
            min={0}
            step={0.01}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="expense-date">Date</Label>
          <DatePicker
            id="expense-date"
            value={spentDate}
            onChange={setSpentDate}
            required
            allowClear={false}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="expense-category">Category</Label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as ExpenseCategory)}
          >
            <SelectTrigger id="expense-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <OptionalFields>
        <div className="grid gap-2">
          <Label htmlFor="expense-merchant">Merchant</Label>
          <Input
            id="expense-merchant"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="e.g. Carrefour, Amazon"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="expense-payment">Payment method</Label>
            <Input
              id="expense-payment"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              placeholder="e.g. Credit card, Cash"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="expense-paid-by">Paid by</Label>
            <Select value={paidByUserId} onValueChange={setPaidByUserId}>
              <SelectTrigger id="expense-paid-by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {memberOptions.map((m) => (
                  <SelectItem key={m.user._id} value={m.user._id}>
                    <MemberDisplay
                      member={m}
                      detail={m.user.email}
                      avatarClassName="size-6"
                    />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="expense-notes">Notes</Label>
          <Textarea
            id="expense-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional details..."
            rows={2}
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
