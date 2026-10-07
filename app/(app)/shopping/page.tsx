"use client";

import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { EntityCollection } from "@/components/shared/entity-collection";
import { useState } from "react";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { LoadingState } from "@/components/shared/loading-state";
import {
  ShoppingListForm,
  type ShoppingListFormSubmitValues,
} from "@/components/shopping/shopping-forms";
import { ShoppingListCard } from "@/components/shopping/shopping-cards";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHousehold } from "@/lib/household-context";

export default function ShoppingPage() {
  const [open, setOpen] = useState(false);
  const { household } = useHousehold();
  const householdId = household?._id;
  const lists = useQuery(
    api.shopping.listLists,
    householdId ? { householdId } : "skip",
  );
  const createList = useMutation(api.shopping.createList);

  if (!householdId || lists === undefined) {
    return <LoadingState label="Loading shopping lists" />;
  }

  const currentHouseholdId = householdId;

  async function handleCreate(values: ShoppingListFormSubmitValues) {
    await createList({
      householdId: currentHouseholdId,
      name: values.name,
    });
    setOpen(false);
  }

  const activeLists = lists.filter((list) => list.status === "active");
  const archivedLists = lists.filter((list) => list.status === "archived");

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{household?.name}</p>
          <h1 className="text-2xl font-semibold">Shopping</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              New list
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New shopping list</DialogTitle>
              <DialogDescription>
                Create a list to track household shopping items.
              </DialogDescription>
            </DialogHeader>
            <ShoppingListForm
              submitLabel="Create list"
              onSubmit={handleCreate}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active" className="mt-6 grid gap-4">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="active">
            Active ({activeLists.length})
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived ({archivedLists.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <ListGrid
            lists={activeLists}
            householdId={currentHouseholdId}
            emptyTitle="No active lists"
            emptyDescription="Create a list to start tracking shopping items."
          />
        </TabsContent>

        <TabsContent value="archived">
          <ListGrid
            lists={archivedLists}
            householdId={currentHouseholdId}
            emptyTitle="No archived lists"
            emptyDescription="Archived lists appear here."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ListGrid({
  lists,
  householdId,
  emptyTitle,
  emptyDescription,
}: {
  lists: Doc<"shoppingLists">[];
  householdId: Id<"households">;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const listData = useQuery(
    api.shopping.dashboard,
    householdId ? { householdId } : "skip",
  );

  if (lists.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 p-5 text-sm">
        <h3 className="font-medium">{emptyTitle}</h3>
        <p className="mt-1 leading-6 text-muted-foreground">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <EntityCollection
      items={lists}
      date={(list) => list.updatedAt}
      defaultDescending
      dateLabel="Updated"
    >
      {(visible) => (
        <>
          <div className="grid gap-3">
            {visible.map((list) => {
              const items =
                listData?.activeLists.find((l) => l.list._id === list._id)
                  ?.items ?? [];
              return (
                <ShoppingListCard
                  key={list._id}
                  list={list}
                  itemCount={items.length}
                  checkedCount={items.filter((item) => item.checked).length}
                />
              );
            })}
          </div>
        </>
      )}
    </EntityCollection>
  );
}
