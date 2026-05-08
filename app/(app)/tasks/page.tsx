"use client";

import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { AnimatePresence } from "framer-motion";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { LoadingState } from "@/components/shared/loading-state";
import { TaskForm, type TaskFormSubmitValues } from "@/components/tasks/task-form";
import { TaskList } from "@/components/tasks/task-list";
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

const taskViews = [
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "overdue", label: "Overdue" },
  { value: "all", label: "All" },
  { value: "mine", label: "Mine" },
  { value: "completed", label: "Completed" },
] as const;

type TaskView = (typeof taskViews)[number]["value"];

export default function TasksPage() {
  const { household } = useHousehold();
  const householdId = household?._id;
  const members = useQuery(
    api.members.listAssignable,
    householdId ? { householdId } : "skip",
  );
  const createTask = useMutation(api.tasks.create);
  const markDone = useMutation(api.tasks.markDone);

  if (!householdId || members === undefined) {
    return <LoadingState label="Loading tasks" />;
  }

  const currentHouseholdId = householdId;

  async function handleCreate(values: TaskFormSubmitValues) {
    await createTask({
      householdId: currentHouseholdId,
      title: values.title,
      description: values.description,
      status: values.status,
      priority: values.priority,
      taskType: values.taskType,
      ownerUserId: values.ownerUserId,
      dueAt: values.dueAt,
      recurrence: values.recurrence,
    });
  }

  async function handleMarkDone(task: Doc<"tasks">) {
    await markDone({ householdId: currentHouseholdId, taskId: task._id });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {household?.name}
          </p>
          <h1 className="text-2xl font-semibold">Tasks</h1>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Create task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create task</DialogTitle>
              <DialogDescription>
                Add an owner, due date, priority, and household context.
              </DialogDescription>
            </DialogHeader>
            <TaskForm
              members={members}
              submitLabel="Create task"
              onSubmit={handleCreate}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="today" className="mt-6 grid gap-4">
        <TabsList className="h-auto flex-wrap justify-start">
          {taskViews.map((view) => (
            <TabsTrigger key={view.value} value={view.value}>
              {view.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <AnimatePresence mode="wait">
          {taskViews.map((view) => (
            <TabsContent key={view.value} value={view.value}>
              <TaskViewPanel
                view={view.value}
                householdId={currentHouseholdId}
                onMarkDone={handleMarkDone}
              />
            </TabsContent>
          ))}
        </AnimatePresence>
      </Tabs>
    </div>
  );
}

function TaskViewPanel({
  view,
  householdId,
  onMarkDone,
}: {
  view: TaskView;
  householdId: Id<"households">;
  onMarkDone: (task: Doc<"tasks">) => void;
}) {
  const tasks = useQuery(api.tasks.list, {
    householdId,
    view,
  });

  if (tasks === undefined) {
    return (
      <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        Loading {view} tasks...
      </p>
    );
  }

  return (
    <TaskList
      tasks={tasks}
      emptyTitle={`No ${view} tasks`}
      emptyDescription="Create a task to start tracking household responsibilities."
      onMarkDone={onMarkDone}
    />
  );
}
