import {
  endOfToday as dateFnsEndOfToday,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isToday,
  startOfToday as dateFnsStartOfToday,
} from "date-fns";

export function formatDate(timestamp?: number | null) {
  if (timestamp === undefined || timestamp === null) {
    return "No date";
  }

  return format(new Date(timestamp), "MMM d, yyyy");
}

export function formatDateTime(timestamp?: number | null) {
  if (timestamp === undefined || timestamp === null) {
    return "No date";
  }

  return format(new Date(timestamp), "MMM d, yyyy h:mm a");
}

export function formatDateInputValue(timestamp?: number | null) {
  if (timestamp === undefined || timestamp === null) {
    return "";
  }

  return format(new Date(timestamp), "yyyy-MM-dd");
}

export function formatTimeInputValue(timestamp?: number | null) {
  if (timestamp === undefined || timestamp === null) {
    return "";
  }

  return format(new Date(timestamp), "HH:mm");
}

export function formatDateTimeInputValue(timestamp?: number | null) {
  if (timestamp === undefined || timestamp === null) {
    return "";
  }

  return `${formatDateInputValue(timestamp)}T${formatTimeInputValue(timestamp)}`;
}

export function parseLocalDate(value: string, fallbackTime = "12:00") {
  if (!value) {
    return undefined;
  }

  return parseLocalDateTime(value, fallbackTime);
}

export function parseLocalDateTime(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) {
    return undefined;
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);

  if (!year || !month || !day || Number.isNaN(hours) || Number.isNaN(minutes)) {
    return undefined;
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
}

export function parseDateTimeInput(value: string) {
  const [dateValue, timeValue] = value.split("T");
  return parseLocalDateTime(dateValue ?? "", timeValue ?? "");
}

export function formatEventDateTime({
  startsAt,
  endsAt,
  isAllDay,
}: {
  startsAt?: number | null;
  endsAt?: number | null;
  isAllDay?: boolean;
}) {
  if (startsAt === undefined || startsAt === null) {
    return "No date";
  }

  if (isAllDay) {
    return `${formatDate(startsAt)} · All day`;
  }

  if (!endsAt) {
    return formatDateTime(startsAt);
  }

  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);

  if (isSameDay(startDate, endDate)) {
    return `${format(startDate, "MMM d, yyyy h:mm a")} - ${format(endDate, "h:mm a")}`;
  }

  return `${formatDateTime(startsAt)} - ${formatDateTime(endsAt)}`;
}

export function startOfToday() {
  return dateFnsStartOfToday().getTime();
}

export function endOfToday() {
  return dateFnsEndOfToday().getTime();
}

export function isDueToday(timestamp?: number | null) {
  return timestamp ? isToday(new Date(timestamp)) : false;
}

export function isOverdue(timestamp?: number | null) {
  return timestamp ? isBefore(new Date(timestamp), new Date()) : false;
}

export function isUpcoming(timestamp?: number | null) {
  return timestamp ? isAfter(new Date(timestamp), new Date()) : false;
}
