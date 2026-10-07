"use client";

import { EntityCollection } from "@/components/shared/entity-collection";
import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";

import type { Doc } from "@/convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/empty-state";
import { EventCard } from "./event-card";

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

export function EventGrid({
  events,
  defaultDescending = false,
  emptyTitle = "No events found",
  emptyDescription = "Create an event to start tracking household activities.",
  onCancel,
}: {
  events: Doc<"events">[];
  defaultDescending?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onCancel?: (event: Doc<"events">) => void;
}) {
  return (
    <EntityCollection
      items={events}
      date={(item) => item.startsAt}
      defaultDescending={defaultDescending}
      dateLabel="Starts"
    >
      {(visible) =>
        visible.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <motion.div
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            variants={container}
            initial="hidden"
            animate="visible"
          >
            {visible.map((event) => (
              <EventCard key={event._id} event={event} onCancel={onCancel} />
            ))}
          </motion.div>
        )
      }
    </EntityCollection>
  );
}
