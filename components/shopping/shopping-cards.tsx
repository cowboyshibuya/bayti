"use client";

import Link from "next/link";
import { ShoppingCart, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

import type { Doc } from "../../../convex/_generated/dataModel";
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
        checked={item.checked}
        onCheckedChange={() => onToggle?.(item)}
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-semibold text-foreground/88",
            item.checked && "text-foreground/36 line-through",
          )}
        >
          {item.name}
        </p>
        {(item.quantity || item.category || item.note) && (
          <p className="mt-0.5 text-xs text-foreground/40">
            {[
              item.quantity,
              item.category,
              item.note,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>
      {onDelete && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="shrink-0 opacity-0 group-hover:opacity-100"
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
  const progress = itemCount > 0 ? Math.round((checkedCount / itemCount) * 100) : 0;

  return (
    <Link href={`/shopping/${list._id}`}>
      <motion.div
        whileHover={{ y: -1, boxShadow: "var(--shadow-card)" }}
        className="rounded-3xl border border-border bg-card/90 p-5 shadow-[0_18px_55px_rgba(25,25,25,0.07)] transition-colors hover:border-foreground/14 hover:bg-muted/45 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.18)] dark:hover:border-white/[0.13] dark:hover:bg-white/[0.055]"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-accent/12">
            <ShoppingCart className="size-5 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-foreground/88">{list.name}</h3>
            <p className="text-xs text-foreground/42">
              {checkedCount} / {itemCount} items
            </p>
          </div>
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
    </Link>
  );
}
