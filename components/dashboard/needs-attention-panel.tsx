"use client";

import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { InboxItemCard } from "@/components/inbox/inbox-item-card";
import { Button } from "@/components/ui/button";
import { PanelShell } from "./panel-shell";

export function NeedsAttentionPanel({
  householdId,
}: {
  householdId: Id<"households">;
}) {
  const items = useQuery(api.inbox.list, {
    householdId,
    view: "all",
    windowDays: 7,
    limit: 4,
  });

  return (
    <PanelShell
      title="Needs attention"
      description="Highest-priority household follow-ups."
      action={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/inbox">Open</Link>
        </Button>
      }
    >
      {items === undefined ? (
        <p className="rounded-2xl bg-muted/40 p-4 text-sm text-foreground/42 dark:bg-white/[0.04]">
          Loading inbox...
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl bg-muted/40 p-4 text-sm text-foreground/42 dark:bg-white/[0.04]">
          Nothing needs attention right now.
        </p>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <InboxItemCard key={item.id} item={item} compact />
          ))}
        </div>
      )}
    </PanelShell>
  );
}
