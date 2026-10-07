"use client";

import Link from "next/link";
import { EntityEditButton } from "@/components/shared/entity-edit-button";
import { ShoppingCart, Trash2, Pencil } from "lucide-react";
import { useHousehold } from "@/lib/household-context";

import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function ShoppingItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: Doc<"shoppingItems">;
  onToggle?: (item: Doc<"shoppingItems">) => void;
  onDelete?: (item: Doc<"shoppingItems">) => void;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-2xl border border-border p-3 transition-colors",
        item.checked
          ? "bg-muted/30 dark:bg-white/[0.025]"
          : "bg-card/80 hover:border-foreground/14 hover:bg-muted/45 dark:bg-white/[0.04] dark:hover:border-white/[0.13] dark:hover:bg-white/[0.06]",
      )}
    >
      <Checkbox
        aria-label={`Mark ${item.name} ${item.checked ? "unchecked" : "checked"}`}
        checked={item.checked}
        onCheckedChange={() => onToggle?.(item)}
        className="relative z-10 shrink-0"
      />
      <EntityEditButton stretch entity={{ kind: "shoppingItem", value: item }}>
        <p
          className={cn(
            "text-sm font-semibold text-foreground",
            item.checked && "text-foreground/36 line-through",
          )}
        >
          {item.name}
        </p>
        {(item.quantity || item.category || item.note) && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[item.quantity, item.category, item.note]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </EntityEditButton>
      {onDelete && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="relative z-10 size-10 shrink-0"
          aria-label={`Delete ${item.name}`}
          onClick={() => onDelete(item)}
        >
          <Trash2 className="size-3.5 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}

export function ShoppingListCard({
  list,
  itemCount,
  checkedCount,
}: {
  list: Doc<"shoppingLists">;
  itemCount: number;
  checkedCount: number;
}) {
  const { membership } = useHousehold();
  const canEdit = ["admin", "adult", "child"].includes(membership?.role ?? "");
  const progress =
    itemCount > 0 ? Math.round((checkedCount / itemCount) * 100) : 0;

  return (
    <div className="relative min-w-0 rounded-xl border border-border bg-card shadow-[0_18px_55px_rgba(25,25,25,0.07)] transition-colors hover:border-foreground/14 hover:bg-muted/45 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.18)] dark:hover:border-white/[0.13] dark:hover:bg-white/[0.055]">
      <Link
        href={`/shopping/${list._id}`}
        aria-label={`Open ${list.name}`}
        className="block min-w-0 rounded-xl p-4 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4"
      >
        <div
          className={`flex min-w-0 items-center gap-3 ${canEdit ? "pr-20" : ""}`}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent/12">
            <ShoppingCart className="size-5 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-foreground">
              {list.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {checkedCount} / {itemCount} items
            </p>
          </div>
        </div>
        {itemCount > 0 && (
          <div
            className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted dark:bg-white/[0.06]"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </Link>
      {canEdit && (
        <EntityEditButton
          entity={{ kind: "shoppingList", value: list }}
          className="absolute right-4 top-4 z-10 flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium hover:bg-muted"
        >
          <Pencil className="size-4" aria-hidden="true" />
          Edit
        </EntityEditButton>
      )}
    </div>
  );
}
