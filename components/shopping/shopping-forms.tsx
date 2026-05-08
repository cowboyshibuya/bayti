"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shoppingListFormSchema } from "@/lib/validations";

export type ShoppingListFormSubmitValues = {
  name: string;
};

export function ShoppingListForm({
  initialName,
  submitLabel,
  onSubmit,
}: {
  initialName?: string;
  submitLabel: string;
  onSubmit: (values: ShoppingListFormSubmitValues) => Promise<void>;
}) {
  const [name, setName] = useState(initialName ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const parsed = shoppingListFormSchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form.");
      setPending(false);
      return;
    }

    try {
      await onSubmit({ name: parsed.data.name });
      if (!initialName) setName("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save list.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="list-name">List name</Label>
        <Input
          id="list-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Weekly groceries"
          required
        />
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

export function ShoppingItemInlineForm({
  onSubmit,
}: {
  onSubmit: (values: { name: string; quantity?: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    try {
      await onSubmit({ name: name.trim(), quantity: quantity.trim() || undefined });
      setName("");
      setQuantity("");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Add item..."
        className="flex-1"
        disabled={pending}
      />
      <Input
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
        placeholder="Qty"
        className="w-20"
        disabled={pending}
      />
      <Button type="submit" size="sm" disabled={pending || !name.trim()}>
        <Plus className="size-4" />
      </Button>
    </form>
  );
}
