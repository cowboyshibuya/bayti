import { Inbox } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export default function InboxPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <EmptyState
        icon={Inbox}
        title="Inbox is ready"
        description="Unsorted tasks and reminders will appear here after the Tasks milestone."
      />
    </div>
  );
}
