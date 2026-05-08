"use client";

import { motion } from "framer-motion";
import { CheckSquare } from "lucide-react";

import type { Doc } from "../../../convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/empty-state";
import { TaskCard } from "./task-card";

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

export function TaskList({
  tasks,
  emptyTitle = "No tasks found",
  emptyDescription = "Create a task or adjust your filters.",
  onMarkDone,
}: {
  tasks: Doc<"tasks">[];
  emptyTitle?: string;
  emptyDescription?: string;
  onMarkDone?: (task: Doc<"tasks">) => void;
}) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <motion.div
      className="grid gap-3"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {tasks.map((task) => (
        <TaskCard key={task._id} task={task} onMarkDone={onMarkDone} />
      ))}
    </motion.div>
  );
}
