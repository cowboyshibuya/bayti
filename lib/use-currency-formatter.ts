"use client";

import { useHousehold } from "@/lib/household-context";
import { formatCurrency } from "@/lib/formatters";

export function useCurrencyFormatter() {
  const { household } = useHousehold();
  return (amount: number, currency = household?.currency ?? "EUR") =>
    formatCurrency(amount, currency);
}
