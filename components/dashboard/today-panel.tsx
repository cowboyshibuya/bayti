import { CheckSquare } from "lucide-react";


import type { Doc } from "@/convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/empty-state";
import { TaskCard } from "@/components/tasks/task-card";
import { PanelShell } from "./panel-shell";

export function TodayPanel({ tasks }: { tasks: Doc<"tasks">[] }) {
  return (
    <PanelShell title="Today" description="Tasks due today.">
      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks due today"
          description="Tasks due today will appear here."
        />
      ) : (
        <div className="grid gap-3">
          {tasks.map((task) => (
            <TaskCard key={task._id} task={task} compact />
          ))}
        </div>
      )}
    </PanelShell>
  );
}
