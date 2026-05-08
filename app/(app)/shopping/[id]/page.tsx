"use client";

import { use, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, CheckCircle2, Trash2 } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { LoadingState } from "@/components/shared/loading-state";
import { ShoppingItemInlineForm } from "@/components/shopping/shopping-forms";
import { ShoppingItemRow } from "@/components/shopping/shopping-cards";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SHOPPING_LIST_STATUSES } from "@/lib/constants";
import { toTitleLabel } from "@/lib/formatters";
import { useHousehold } from "@/lib/household-context";

export default function ShoppingListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { household } = useHousehold();
  const householdId = household?._id;
  const data = useQuery(
    api.shopping.getList,
    householdId ? { householdId, listId: id as Id<"shoppingLists"> } : "skip",
  );
  const addItem = useMutation(api.shopping.addItem);
  const toggleItem = useMutation(api.shopping.toggleItem);
  const deleteItem = useMutation(api.shopping.deleteItem);
  const clearCompleted = useMutation(api.shopping.clearCompleted);
  const updateList = useMutation(api.shopping.updateList);
  const deleteList = useMutation(api.shopping.deleteList);
  const [showChecked, setShowChecked] = useState(true);

  if (!householdId || data === undefined) {
    return <LoadingState label="Loading list" />;
  }

  const { list, items } = data;
  const uncheckedItems = items.filter((item) => !item.checked);
  const checkedItems = items.filter((item) => item.checked);
  const currentHouseholdId = householdId;

  async function handleAddItem(values: { name: string; quantity?: string }) {
    await addItem({
      householdId: currentHouseholdId,
      listId: list._id,
      name: values.name,
      quantity: values.quantity,
    });
  }

  async function handleToggleItem(item: Doc<"shoppingItems">) {
    await toggleItem({
      householdId: currentHouseholdId,
      listId: list._id,
      itemId: item._id,
    });
  }

  async function handleDeleteItem(item: Doc<"shoppingItems">) {
    await deleteItem({
      householdId: currentHouseholdId,
      listId: list._id,
      itemId: item._id,
    });
  }

  async function handleClearCompleted() {
    await clearCompleted({
      householdId: currentHouseholdId,
      listId: list._id,
    });
  }

  async function handleArchive() {
    await updateList({
      householdId: currentHouseholdId,
      listId: list._id,
      status: "archived",
    });
  }

  async function handleDeleteList() {
    await deleteList({
      householdId: currentHouseholdId,
      listId: list._id,
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Button variant="ghost" asChild className="-ml-2 mb-4">
        <Link href="/shopping">
          <ArrowLeft className="size-4" />
          Back to shopping
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{list.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {uncheckedItems.length} remaining · {checkedItems.length} completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          {checkedItems.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClearCompleted}>
              <Trash2 className="size-3.5" />
              Clear completed
            </Button>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Manage
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Manage list</DialogTitle>
                <DialogDescription>
                  Archive or delete this shopping list.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <Button variant="outline" onClick={handleArchive}>
                  Archive list
                </Button>
                <Button variant="destructive" onClick={handleDeleteList}>
                  Delete list
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mt-6">
        <ShoppingItemInlineForm onSubmit={handleAddItem} />
      </div>

      <div className="mt-6 space-y-2">
        <AnimatePresence>
          {uncheckedItems.map((item) => (
            <ShoppingItemRow
              key={item._id}
              item={item}
              onToggle={handleToggleItem}
              onDelete={handleDeleteItem}
            />
          ))}
        </AnimatePresence>
      </div>

      {checkedItems.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowChecked(!showChecked)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <CheckCircle2 className="size-4" />
            Completed ({checkedItems.length})
          </button>
          {showChecked && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 space-y-2"
            >
              {checkedItems.map((item) => (
                <ShoppingItemRow
                  key={item._id}
                  item={item}
                  onToggle={handleToggleItem}
                  onDelete={handleDeleteItem}
                />
              ))}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
