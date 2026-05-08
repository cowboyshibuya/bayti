import { Badge } from "@/components/ui/badge";
import { toTitleLabel } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export function BillStatusBadge({
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
        status === "paid" && "bg-success/15 text-success dark:text-success dark:bg-success/20",
        status === "upcoming" && "bg-info/15 text-info dark:text-info dark:bg-info/20",
        status === "due_soon" && "bg-warning/15 text-warning dark:text-warning dark:bg-warning/20",
        status === "overdue" && "bg-destructive/15 text-destructive dark:text-destructive dark:bg-destructive/20",
        status === "cancelled" && "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
        className,
      )}
    >
      {toTitleLabel(status)}
    </Badge>
  );
}
