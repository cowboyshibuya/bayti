"use client";

import { motion } from "framer-motion";


import type { Doc } from "@/convex/_generated/dataModel";
import { formatDateTime } from "@/lib/dates";
import { UserAvatar } from "@/components/shared/user-avatar";
import { PanelShell } from "./panel-shell";

export type ActivityEventSummary = {
  _id: string;
  message: string;
  createdAt: number;
  actor?: Doc<"users"> | null;
};

const list = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const listItem = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
};

export function RecentActivityPanel({
  activity,
}: {
  activity: ActivityEventSummary[];
}) {
  return (
    <PanelShell
      title="Recent activity"
      description="Household changes from Convex."
    >
      {activity.length === 0 ? (
        <p className="rounded-2xl bg-muted/40 p-4 text-sm text-foreground/42 dark:bg-white/[0.04]">
          Activity appears here as household modules are used.
        </p>
      ) : (
        <motion.div
          className="space-y-4"
          variants={list}
          initial="hidden"
          animate="visible"
        >
          {activity.map((event) => (
            <motion.div
              key={event._id}
              variants={listItem}
              className="flex gap-3"
            >
              <UserAvatar
                name={event.actor?.name ?? "Family member"}
                imageUrl={event.actor?.image}
                className="mt-0.5 size-7"
              />
              <div>
                <p className="text-sm font-semibold text-foreground/88">{event.message}</p>
                <p className="text-xs text-foreground/38">
                  {formatDateTime(event.createdAt)}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </PanelShell>
  );
}
