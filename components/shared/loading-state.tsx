import { Loader2 } from "lucide-react";

export function LoadingState({ label }: { label: string }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {label}
      </div>
    </main>
  );
}
