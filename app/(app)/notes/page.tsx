import { NotebookText } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export default function NotesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <EmptyState
        icon={NotebookText}
        title="No notes yet"
        description="Household notes and search start in the Notes milestone."
      />
    </div>
  );
}
