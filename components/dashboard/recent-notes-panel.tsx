import { NotebookText } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PanelShell } from "./panel-shell";

export function RecentNotesPanel() {
  return (
    <PanelShell title="Recent notes" description="Household reference notes.">
      <EmptyState
        icon={NotebookText}
        title="No notes yet"
        description="Notes and decisions will appear here after the Notes milestone."
      />
    </PanelShell>
  );
}
