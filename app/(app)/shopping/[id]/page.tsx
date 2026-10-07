"use client";

import { EntityCollection } from "@/components/shared/entity-collection";
import { use, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, CheckCircle2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { LoadingState } from "@/components/shared/loading-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
import { useHousehold } from "@/lib/household-context";

export default function ShoppingListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
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
  const [itemToDelete, setItemToDelete] = useState<Doc<"shoppingItems"> | null>(
    null,
  );
  const [clearCompletedOpen, setClearCompletedOpen] = useState(false);
  const [deleteListOpen, setDeleteListOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  async function handleDeleteItem() {
    if (!itemToDelete) return;

    setDeletePending(true);
    setDeleteError(null);

    try {
      await deleteItem({
        householdId: currentHouseholdId,
        listId: list._id,
        itemId: itemToDelete._id,
      });
      setItemToDelete(null);
    } catch (caught) {
      setDeleteError(
        caught instanceof Error ? caught.message : "Could not delete item.",
      );
    } finally {
      setDeletePending(false);
    }
  }

  async function handleClearCompleted() {
    setDeletePending(true);
    setDeleteError(null);

    try {
      await clearCompleted({
        householdId: currentHouseholdId,
        listId: list._id,
      });
      setClearCompletedOpen(false);
    } catch (caught) {
      setDeleteError(
        caught instanceof Error
          ? caught.message
          : "Could not clear completed items.",
      );
    } finally {
      setDeletePending(false);
    }
  }

  async function handleDeleteList() {
    setDeletePending(true);
    setDeleteError(null);

    try {
      await deleteList({
        householdId: currentHouseholdId,
        listId: list._id,
      });
      setDeleteListOpen(false);
      router.push("/shopping");
    } catch (caught) {
      setDeleteError(
        caught instanceof Error ? caught.message : "Could not delete list.",
      );
    } finally {
      setDeletePending(false);
    }
  }

  function requestDeleteItem(item: Doc<"shoppingItems">) {
    setDeleteError(null);
    setItemToDelete(item);
  }

  function requestClearCompleted() {
    setDeleteError(null);
    setClearCompletedOpen(true);
  }

  function requestDeleteList() {
    setDeleteError(null);
    setDeleteListOpen(true);
  }

  async function handleArchive() {
    await updateList({
      householdId: currentHouseholdId,
      listId: list._id,
      status: "archived",
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
            <Button variant="outline" size="sm" onClick={requestClearCompleted}>
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
                <Button variant="destructive" onClick={requestDeleteList}>
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

      <EntityCollection
        items={items.map((item) => ({
          ...item,
          status: item.checked ? "completed" : "remaining",
        }))}
        date={(item) => item.createdAt}
        dateLabel="Added"
      >
        {(visible) => (
          <>
            <div className="mt-6 space-y-2">
              <AnimatePresence>
                {visible
                  .filter((item) => !item.checked)
                  .map((item) => (
                    <ShoppingItemRow
                      key={item._id}
                      item={item}
                      onToggle={handleToggleItem}
                      onDelete={requestDeleteItem}
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
                    {visible
                      .filter((item) => item.checked)
                      .map((item) => (
                        <ShoppingItemRow
                          key={item._id}
                          item={item}
                          onToggle={handleToggleItem}
                          onDelete={requestDeleteItem}
                        />
                      ))}
                  </motion.div>
                )}
              </div>
            )}
          </>
        )}
      </EntityCollection>

      <ConfirmDialog
        open={Boolean(itemToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setItemToDelete(null);
            setDeleteError(null);
          }
        }}
        title="Delete shopping item?"
        description={
          itemToDelete
            ? `This permanently deletes "${itemToDelete.name}" from this list. This cannot be undone.`
            : "This permanently deletes the shopping item."
        }
        actionLabel="Delete item"
        pending={deletePending}
        error={itemToDelete ? deleteError : null}
        onConfirm={handleDeleteItem}
      />
      <ConfirmDialog
        open={clearCompletedOpen}
        onOpenChange={(open) => {
          setClearCompletedOpen(open);
          if (!open) setDeleteError(null);
        }}
        title="Clear completed items?"
        description={`This permanently deletes ${checkedItems.length} completed item${checkedItems.length === 1 ? "" : "s"} from this list. This cannot be undone.`}
        actionLabel="Clear completed"
        pending={deletePending}
        error={clearCompletedOpen ? deleteError : null}
        onConfirm={handleClearCompleted}
      />
      <ConfirmDialog
        open={deleteListOpen}
        onOpenChange={(open) => {
          setDeleteListOpen(open);
          if (!open) setDeleteError(null);
        }}
        title="Delete shopping list?"
        description={`This permanently deletes "${list.name}" and all of its items. This cannot be undone.`}
        actionLabel="Delete list"
        pending={deletePending}
        error={deleteListOpen ? deleteError : null}
        onConfirm={handleDeleteList}
      />
    </div>
  );
}
