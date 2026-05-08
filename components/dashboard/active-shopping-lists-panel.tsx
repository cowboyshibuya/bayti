import { ShoppingCart } from "lucide-react";

import type { Doc } from "@/convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/empty-state";
import { ShoppingListCard } from "@/components/shopping/shopping-cards";
import { PanelShell } from "./panel-shell";

export function ActiveShoppingListsPanel({
  lists,
}: {
  lists: { list: Doc<"shoppingLists">; items: Doc<"shoppingItems">[] }[];
}) {
  return (
    <PanelShell title="Shopping lists" description="Active household lists.">
      {lists.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No shopping lists"
          description="Create a list to track what the household needs."
        />
      ) : (
        <div className="grid gap-3">
          {lists.map(({ list, items }) => (
            <ShoppingListCard
              key={list._id}
              list={list}
              itemCount={items.length}
              checkedCount={items.filter((item) => item.checked).length}
            />
          ))}
        </div>
      )}
    </PanelShell>
  );
}
