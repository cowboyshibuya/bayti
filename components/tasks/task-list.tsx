"use client";

import { EntityCollection } from "@/components/shared/entity-collection";
import { CheckSquare } from "lucide-react";

import type { Doc } from "@/convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/empty-state";
import { TaskCard } from "./task-card";

export function TaskList({
  tasks,
  dateMode = "due",
  emptyTitle = "No tasks found",
  emptyDescription = "Create a task or adjust your filters.",
  onMarkDone,
}: {
  tasks: Doc<"tasks">[];
  dateMode?: "due" | "completed";
  emptyTitle?: string;
  emptyDescription?: string;
  onMarkDone?: (task: Doc<"tasks">) => void;
}) {
  return (
    <EntityCollection
      items={tasks}
      date={(item) =>
        dateMode === "completed" ? item.completedAt : item.dueAt
      }
      dateLabel={dateMode === "completed" ? "Completed" : "Due date"}
      defaultDescending={dateMode === "completed"}
      priority
    >
      {(visible) =>
        visible.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <div className="grid gap-3">
            {visible.map((task) => (
              <TaskCard key={task._id} task={task} onMarkDone={onMarkDone} />
            ))}
          </div>
        )
      }
    </EntityCollection>
  );
}
