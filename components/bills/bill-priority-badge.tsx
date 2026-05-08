import { Badge } from "@/components/ui/badge";
import { toTitleLabel } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export function BillPriorityBadge({
  priority,
  className,
}: {
  priority: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        priority === "urgent" && "border-destructive/30 bg-destructive/5 text-destructive",
        priority === "high" && "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300",
        priority === "medium" && "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
        priority === "low" && "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400",
        className,
      )}
    >
      {toTitleLabel(priority)}
    </Badge>
  );
}
