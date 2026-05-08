import { FileText } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export default function DocumentsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <EmptyState
        icon={FileText}
        title="No documents yet"
        description="Document metadata and uploads start in the Documents milestone."
      />
    </div>
  );
}
