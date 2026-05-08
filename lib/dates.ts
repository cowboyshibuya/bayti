import {
  endOfToday as dateFnsEndOfToday,
  format,
  isAfter,
  isBefore,
  isToday,
  startOfToday as dateFnsStartOfToday,
} from "date-fns";

export function formatDate(timestamp?: number | null) {
  if (!timestamp) {
    return "No date";
  }

  return format(new Date(timestamp), "MMM d, yyyy");
}

export function formatDateTime(timestamp?: number | null) {
  if (!timestamp) {
    return "No date";
  }

  return format(new Date(timestamp), "MMM d, yyyy h:mm a");
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
