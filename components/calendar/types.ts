export type CalendarEntry = {
  id: string;
  entityType: "task" | "bill" | "event";
  title: string;
  date: number;
  endDate?: number;
  isAllDay?: boolean;
  color: "accent" | "warning" | "info";
  status: string;
  link: string;
};
