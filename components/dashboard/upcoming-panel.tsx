import { CalendarClock } from "lucide-react";


import type { Doc } from "@/convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/empty-state";
import { TaskCard } from "@/components/tasks/task-card";
import { PanelShell } from "./panel-shell";

export function UpcomingPanel({ tasks }: { tasks: Doc<"tasks">[] }) {
  return (
    <PanelShell title="Upcoming" description="Tasks coming due soon.">
      {tasks.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No upcoming tasks"
          description="Future-dated tasks will appear here."
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
