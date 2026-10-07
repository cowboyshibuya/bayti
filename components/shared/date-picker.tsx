"use client";

import { useMemo, useState, useId } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";

import { useFormDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  id?: string;
  "aria-label"?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  allowClear?: boolean;
  className?: string;
};

type TimePickerProps = {
  id?: string;
  "aria-label"?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  allowClear?: boolean;
  className?: string;
};

type DateTimePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const quickTimes = [
  { label: "Morning", value: "08:00" },
  { label: "Lunch", value: "12:00" },
  { label: "Afternoon", value: "15:00" },
  { label: "Evening", value: "18:00" },
];
const hourOptions = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0"),
);
const minuteOptions = Array.from({ length: 12 }, (_, index) =>
  String(index * 5).padStart(2, "0"),
);

export function DatePicker({
  id,
  "aria-label": ariaLabel,
  value,
  onChange,
  placeholder = "Pick date",
  disabled,
  required,
  allowClear = true,
  className,
}: DatePickerProps) {
  const dialog = useFormDialog();
  const change = (value: string) => {
    dialog?.setDirty(true);
    onChange(value);
  };
  const generatedId = useId();
  const selectedDate = parseDateValue(value);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(selectedDate ?? new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(visibleMonth);
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 }),
    });
  }, [visibleMonth]);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen && selectedDate) {
          setVisibleMonth(selectedDate);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id ?? generatedId}
          aria-label={ariaLabel}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-start rounded-2xl px-3 text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          {required && <span className="sr-only">Required</span>}
          <CalendarClock className="size-4 text-muted-foreground" />
          <span className="truncate">
            {selectedDate ? format(selectedDate, "MMM d, yyyy") : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(22rem,calc(100vw-2rem))] p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Previous month"
            onClick={() => setVisibleMonth((month) => subMonths(month, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">
              {format(visibleMonth, "MMMM yyyy")}
            </p>
            <p className="text-xs text-muted-foreground">Choose a day</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Next month"
            onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1">
          {weekdays.map((weekday) => (
            <div
              key={weekday}
              className="flex h-7 items-center justify-center text-[11px] font-medium text-muted-foreground"
            >
              {weekday}
            </div>
          ))}
          {days.map((day) => {
            const selected = selectedDate && isSameDay(day, selectedDate);
            const outside = !isSameMonth(day, visibleMonth);

            return (
              <Button
                key={day.toISOString()}
                type="button"
                variant={selected ? "default" : "ghost"}
                size="icon-sm"
                className={cn(
                  "h-9 w-full rounded-xl text-sm",
                  outside && "text-muted-foreground",
                  isToday(day) &&
                    !selected &&
                    "bg-accent/12 text-foreground hover:bg-accent/18",
                )}
                onClick={() => {
                  change(formatDateValue(day));
                  setOpen(false);
                }}
              >
                {format(day, "d")}
              </Button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              change(formatDateValue(new Date()));
              setOpen(false);
            }}
          >
            Today
          </Button>
          {allowClear && !required && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                change("");
                setOpen(false);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TimePicker({
  id,
  "aria-label": ariaLabel,
  value,
  onChange,
  placeholder = "Pick time",
  disabled,
  required,
  allowClear = true,
  className,
}: TimePickerProps) {
  const dialog = useFormDialog();
  const change = (value: string) => {
    dialog?.setDirty(true);
    onChange(value);
  };
  const generatedId = useId();
  const [open, setOpen] = useState(false);
  const selected = parseTimeValue(value);
  const hour = selected.hour;
  const minute = selected.minute;

  function commit(nextHour = hour, nextMinute = minute) {
    change(`${nextHour}:${nextMinute}`);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id ?? generatedId}
          aria-label={ariaLabel}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-start rounded-2xl px-3 text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          {required && <span className="sr-only">Required</span>}
          <Clock className="size-4 text-muted-foreground" />
          <span className="truncate">
            {value ? formatTimeLabel(value) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(23rem,calc(100vw-2rem))] p-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Choose time</p>
            <p className="text-xs text-muted-foreground">
              Five-minute precision
            </p>
          </div>
          {allowClear && !required && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                change("");
                setOpen(false);
              }}
            >
              Clear
            </Button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {quickTimes.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={value === option.value ? "secondary" : "outline"}
              size="sm"
              className="justify-start"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
              <span className="ml-auto text-xs text-muted-foreground">
                {formatTimeLabel(option.value)}
              </span>
            </Button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] gap-2">
          <div className="grid gap-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Hour
            </p>
            <div className="grid max-h-36 grid-cols-3 gap-1 overflow-y-auto rounded-xl border bg-muted/25 p-1">
              {hourOptions.map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={hour === option ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-lg px-0"
                  onClick={() => {
                    commit(option, minute);
                  }}
                >
                  {option}
                  {hour === option && <Check className="size-3" />}
                </Button>
              ))}
            </div>
          </div>

          <span className="pt-8 text-lg font-semibold text-muted-foreground">
            :
          </span>

          <div className="grid gap-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Minute
            </p>
            <div className="grid max-h-36 grid-cols-3 gap-1 overflow-y-auto rounded-xl border bg-muted/25 p-1">
              {minuteOptions.map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={minute === option ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-lg px-0"
                  onClick={() => {
                    commit(hour, option);
                  }}
                >
                  {option}
                  {minute === option && <Check className="size-3" />}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3">
          <Input
            inputMode="numeric"
            value={hour}
            maxLength={2}
            aria-label="Hour"
            onChange={(event) => {
              const next = normalizeHour(event.target.value);
              commit(next, minute);
            }}
          />
          <Input
            inputMode="numeric"
            value={minute}
            maxLength={2}
            aria-label="Minute"
            onChange={(event) => {
              const next = normalizeMinute(event.target.value);
              commit(hour, next);
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DateTimePicker({
  id,
  value,
  onChange,
  disabled,
  required,
  className,
}: DateTimePickerProps) {
  const { dateValue, timeValue } = splitDateTimeValue(value);

  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
      <DatePicker
        id={id}
        value={dateValue}
        onChange={(nextDate) => {
          onChange(nextDate ? `${nextDate}T${timeValue || "09:00"}` : "");
        }}
        placeholder="Pick date"
        disabled={disabled}
        required={required}
        allowClear={!required}
      />
      <TimePicker
        id={id ? `${id}-time` : undefined}
        aria-label="Time"
        value={timeValue}
        onChange={(nextTime) => {
          onChange(dateValue && nextTime ? `${dateValue}T${nextTime}` : "");
        }}
        placeholder="Pick time"
        disabled={disabled || !dateValue}
        required={required}
        allowClear={!required}
      />
    </div>
  );
}

function parseDateValue(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDateValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function parseTimeValue(value: string) {
  const [rawHour, rawMinute] = value.split(":");
  return {
    hour: normalizeHour(rawHour ?? "09"),
    minute: normalizeMinute(rawMinute ?? "00"),
  };
}

function normalizeHour(value: string) {
  const numeric = Number(value.replace(/\D/g, ""));
  if (Number.isNaN(numeric)) return "00";
  return String(Math.min(Math.max(numeric, 0), 23)).padStart(2, "0");
}

function normalizeMinute(value: string) {
  const numeric = Number(value.replace(/\D/g, ""));
  if (Number.isNaN(numeric)) return "00";
  return String(Math.min(Math.max(numeric, 0), 59)).padStart(2, "0");
}

function formatTimeLabel(value: string) {
  const { hour, minute } = parseTimeValue(value);
  const date = new Date(2024, 0, 1, Number(hour), Number(minute));
  return format(date, "h:mm a");
}

function splitDateTimeValue(value: string) {
  const [dateValue = "", timeValue = ""] = value.split("T");
  return { dateValue, timeValue };
}
