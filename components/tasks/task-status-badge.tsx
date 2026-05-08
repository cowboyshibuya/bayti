import { Badge } from "@/components/ui/badge";
import { toTitleLabel } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export function TaskStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        status === "done" && "bg-success/15 text-success dark:text-success dark:bg-success/20",
        status === "cancelled" && "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
        status === "waiting" && "bg-warning/15 text-warning dark:text-warning dark:bg-warning/20",
        className,
      )}
    >
      {toTitleLabel(status)}
    </Badge>
  );
}
