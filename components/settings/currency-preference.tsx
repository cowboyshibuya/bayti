"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { SUPPORTED_CURRENCIES } from "@/convex/lib/currency";
import { useHousehold } from "@/lib/household-context";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CurrencyPreference() {
  const { household, membership } = useHousehold();
  const updateCurrency = useMutation(api.households.updateCurrency);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  if (!household) return null;
  const canEdit = membership?.role === "admin";
  return (
    <div className="grid min-w-0 gap-2 border-t pt-5">
      <Label htmlFor="default-currency">Default currency</Label>
      <p id="currency-description" className="text-sm text-muted-foreground">
        Used automatically for new expenses, bills, and documents in this
        workspace. Existing records keep their currency.
      </p>
      <Select
        value={household.currency ?? "EUR"}
        disabled={!canEdit || pending}
        onValueChange={async (currency) => {
          if (saving.current) return;
          saving.current = true;
          setPending(true);
          setError(null);
          try {
            await updateCurrency({ householdId: household._id, currency });
            toast.success("Default currency updated");
          } catch (caught) {
            setError(
              caught instanceof Error
                ? caught.message
                : "Could not update currency. Please try again.",
            );
          } finally {
            saving.current = false;
            setPending(false);
          }
        }}
      >
        <SelectTrigger
          id="default-currency"
          aria-describedby={
            error
              ? "currency-description currency-error"
              : "currency-description"
          }
          aria-invalid={Boolean(error)}
          className="h-11 max-w-sm text-base sm:text-sm"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_CURRENCIES.map((currency) => (
            <SelectItem key={currency} value={currency}>
              {currency} —{" "}
              {new Intl.DisplayNames(["en"], { type: "currency" }).of(currency)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending && (
        <p role="status" className="text-sm text-muted-foreground">
          Saving currency…
        </p>
      )}
      {!canEdit && (
        <p className="text-sm text-muted-foreground">
          Only workspace admins can change the default currency.
        </p>
      )}
      {error && (
        <p id="currency-error" role="alert" className="text-sm text-foreground">
          {error}
        </p>
      )}
    </div>
  );
}
