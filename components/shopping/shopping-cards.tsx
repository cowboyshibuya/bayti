"use client";

import Link from "next/link";
import { EntityEditButton } from "@/components/shared/entity-edit-button";
import { ShoppingCart, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

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
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-border p-3 transition-colors",
        item.checked
          ? "bg-muted/30 dark:bg-white/[0.025]"
          : "bg-card/80 hover:border-foreground/14 hover:bg-muted/45 dark:bg-white/[0.04] dark:hover:border-white/[0.13] dark:hover:bg-white/[0.06]",
      )}
    >
      <Checkbox
        aria-label={`Mark ${item.name} ${item.checked ? "unchecked" : "checked"}`}
        checked={item.checked}
        onCheckedChange={() => onToggle?.(item)}
        className="shrink-0"
      />
      <EntityEditButton entity={{ kind: "shoppingItem", value: item }}>
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
          className="size-10 shrink-0"
          aria-label={`Delete ${item.name}`}
          onClick={() => onDelete(item)}
        >
          <Trash2 className="size-3.5 text-muted-foreground" />
        </Button>
      )}
    </motion.div>
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
  const progress =
    itemCount > 0 ? Math.round((checkedCount / itemCount) * 100) : 0;

  return (
    <div className="min-w-0">
      <motion.div className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-[0_18px_55px_rgba(25,25,25,0.07)] transition-colors hover:border-foreground/14 hover:bg-muted/45 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.18)] dark:hover:border-white/[0.13] dark:hover:bg-white/[0.055]">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-accent/12">
            <ShoppingCart className="size-5 text-accent" />
          </div>
          <EntityEditButton
            entity={{ kind: "shoppingList", value: list }}
            href={`/shopping/${list._id}`}
          >
            <h3 className="min-w-0 flex-1 truncate font-semibold text-foreground">
              {list.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {checkedCount} / {itemCount} items
            </p>
          </EntityEditButton>
          <Link
            href={`/shopping/${list._id}`}
            className="shrink-0 rounded-lg px-2 py-2 text-sm font-medium hover:underline focus-visible:outline-2"
          >
            Open list
          </Link>
        </div>
        {itemCount > 0 && (
          <div className="mt-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted dark:bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
