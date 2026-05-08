import type { ComponentType } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  description: string;
  icon?: ComponentType<{ className?: string }>;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border bg-muted/35 p-5 text-sm [animation:fade-in-up_0.3s_ease-out] dark:bg-white/[0.035]",
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 flex size-10 items-center justify-center rounded-2xl bg-card ring-1 ring-border dark:bg-white/[0.06] dark:ring-white/[0.08]">
          <Icon className="size-5 text-foreground/44" />
        </div>
      )}
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 leading-6 text-muted-foreground">{description}</p>
      {action && (
        <Button className="mt-4" size="sm" variant="accent" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
