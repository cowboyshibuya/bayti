"use client";

import { useId, useState, useEffect, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useHousehold } from "@/lib/household-context";
import { parseLocalDate } from "@/lib/dates";

export type ListControls = {
  search: string;
  sort: string;
  filters: Record<string, string>;
  from: string;
  to: string;
  fromAt?: number;
  toAt?: number;
};
export type ListRecord = {
  _id: string;
  title?: string;
  name?: string;
  status?: string;
  category?: string;
  priority?: string;
  ownerUserId?: string;
  paidByUserId?: string;
  targetUserId?: string;
  checked?: boolean;
  amount?: number;
  amountExpected?: number;
  currency?: string;
};
export function compareDates(
  a: number | undefined,
  b: number | undefined,
  descending: boolean,
) {
  if (a === undefined || b === undefined)
    return a === b ? 0 : a === undefined ? 1 : -1;
  return descending ? b - a : a - b;
}

export function EntityCollection<T extends ListRecord>({
  items,
  date,
  defaultDescending = false,
  dateLabel = "Date",
  children,
  amount = false,
  priority = false,
  onControlsChange,
}: {
  items: T[];
  date: (item: T) => number | undefined;
  defaultDescending?: boolean;
  dateLabel?: string;
  children: (items: T[]) => ReactNode;
  amount?: boolean;
  priority?: boolean;
  onControlsChange?: (controls: ListControls) => void;
}) {
  const { household } = useHousehold();
  return (
    <Collection
      key={`${household?._id}:${dateLabel}:${defaultDescending}`}
      {...{
        items,
        date,
        defaultDescending,
        dateLabel,
        children,
        amount,
        priority,
        onControlsChange,
      }}
    />
  );
}
function Collection<T extends ListRecord>({
  items,
  date,
  defaultDescending,
  dateLabel,
  children,
  amount,
  priority,
  onControlsChange,
}: Parameters<typeof EntityCollection<T>>[0]) {
  const id = useId();
  const [search, setSearch] = useState("");
  const defaultSort = defaultDescending ? "date-desc" : "date-asc";
  const [sort, setSort] = useState(defaultSort);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  useEffect(() => {
    onControlsChange?.({
      search,
      sort,
      filters,
      from,
      to,
      fromAt: from ? parseLocalDate(from, "00:00") : undefined,
      toAt: to ? (parseLocalDate(to, "23:59") ?? 0) + 59999 : undefined,
    });
  }, [search, sort, filters, from, to, onControlsChange]);
  const filterKeys = (
    [
      "status",
      "category",
      "ownerUserId",
      "paidByUserId",
      "targetUserId",
    ] as const
  ).filter(
    (key) =>
      items.some((item) => item[key] !== undefined) || Boolean(filters[key]),
  );
  const labels: Record<string, string> = {
    status: "Status",
    category: "Category",
    ownerUserId: "Owner",
    paidByUserId: "Paid by",
    targetUserId: "Recipient",
  };
  const filtered = items
    .filter((item) => {
      const time = date(item);
      return (
        (item.title ?? item.name ?? "")
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        filterKeys.every(
          (key) =>
            !filters[key] || (item[key] ?? "unassigned") === filters[key],
        ) &&
        (!from ||
          (time !== undefined &&
            time >= (parseLocalDate(from, "00:00") ?? 0))) &&
        (!to ||
          (time !== undefined &&
            time <= (parseLocalDate(to, "23:59") ?? Infinity) + 59999))
      );
    })
    .sort((a, b) => {
      let diff = 0;
      if (sort.startsWith("date"))
        diff = compareDates(date(a), date(b), sort === "date-desc");
      if (sort === "title")
        diff = (a.title ?? a.name ?? "").localeCompare(b.title ?? b.name ?? "");
      if (sort === "amount")
        diff =
          (a.currency ?? "").localeCompare(b.currency ?? "") ||
          (b.amount ?? b.amountExpected ?? 0) -
            (a.amount ?? a.amountExpected ?? 0);
      if (sort === "category")
        diff = (a.category ?? "").localeCompare(b.category ?? "");
      if (sort === "priority") {
        const ranks: Record<string, number> = { high: 0, medium: 1, low: 2 };
        diff = (ranks[a.priority ?? ""] ?? 3) - (ranks[b.priority ?? ""] ?? 3);
      }
      return diff || a._id.localeCompare(b._id);
    });
  const active = Boolean(
    search ||
    from ||
    to ||
    Object.values(filters).some(Boolean) ||
    sort !== defaultSort,
  );
  const selectClass =
    "h-10 min-w-0 rounded-xl border bg-card px-3 text-base sm:text-sm";
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex min-w-0 flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <label
          className="grid min-w-0 flex-[2_1_12rem] gap-1.5 text-xs font-medium"
          htmlFor={`${id}-search`}
        >
          Search
          <Input
            id={`${id}-search`}
            className="h-10 text-base sm:text-sm"
            placeholder="Search by title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label
          className="grid min-w-0 flex-[1_1_10rem] gap-1.5 text-xs font-medium"
          htmlFor={`${id}-sort`}
        >
          Sort by
          <select
            id={`${id}-sort`}
            className={selectClass}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="date-asc">{dateLabel}: earliest first</option>
            <option value="date-desc">{dateLabel}: latest first</option>
            <option value="title">Title: A–Z</option>
            {items.some((item) => item.category) && (
              <option value="category">Category: A–Z</option>
            )}
            {amount && (
              <option value="amount">Amount: highest per currency</option>
            )}
            {priority && (
              <option value="priority">Priority: highest first</option>
            )}
          </select>
        </label>
        {filterKeys.map((key) => (
          <AssigneeFilter
            key={key}
            id={`${id}-${key}`}
            label={labels[key]}
            field={key}
            items={items}
            value={filters[key] ?? ""}
            onChange={(value) => setFilters({ ...filters, [key]: value })}
            className={selectClass}
          />
        ))}
        <label
          className="grid min-w-0 flex-[1_1_9rem] gap-1.5 text-xs font-medium"
          htmlFor={`${id}-from`}
        >
          From
          <Input
            id={`${id}-from`}
            type="date"
            className="h-10 text-base sm:text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label
          className="grid min-w-0 flex-[1_1_9rem] gap-1.5 text-xs font-medium"
          htmlFor={`${id}-to`}
        >
          To
          <Input
            id={`${id}-to`}
            type="date"
            className="h-10 text-base sm:text-sm"
            min={from}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        {active && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              setSort(defaultSort);
              setFilters({});
              setFrom("");
              setTo("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "result" : "results"}
        {active && " · Custom view"}
      </p>
      {children(filtered)}
    </div>
  );
}

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
function AssigneeFilter<T extends ListRecord>({
  id,
  label,
  field,
  items,
  value,
  onChange,
  className,
}: {
  id: string;
  label: string;
  field:
    "status" | "category" | "ownerUserId" | "paidByUserId" | "targetUserId";
  items: T[];
  value: string;
  onChange: (value: string) => void;
  className: string;
}) {
  const { household } = useHousehold();
  const members = useQuery(
    api.members.listAssignable,
    household ? { householdId: household._id } : "skip",
  );
  const options = [
    ...new Set([
      ...items.map((item) => item[field] ?? "unassigned"),
      ...(value ? [value] : []),
    ]),
  ].sort();
  return (
    <label
      htmlFor={id}
      className="grid min-w-0 flex-[1_1_9rem] gap-1.5 text-xs font-medium"
    >
      {label}
      <select
        id={id}
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {field.endsWith("UserId")
              ? (members?.find((m) => m.user?._id === option)?.user?.name ??
                members?.find((m) => m.user?._id === option)?.user?.email ??
                (option === "unassigned" ? "Unassigned" : "Member"))
              : option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}
