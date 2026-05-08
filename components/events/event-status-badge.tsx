import { Badge } from "@/components/ui/badge";
import { toTitleLabel } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export function EventStatusBadge({
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
        status === "upcoming" && "bg-info/15 text-info dark:text-info dark:bg-info/20",
        status === "ongoing" && "bg-warning/15 text-warning dark:text-warning dark:bg-warning/20",
        status === "completed" && "bg-success/15 text-success dark:text-success dark:bg-success/20",
        status === "cancelled" && "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
        className,
      )}
    >
      {toTitleLabel(status)}
    </Badge>
  );
}
