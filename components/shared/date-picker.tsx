"use client";

import { CalendarClock } from "lucide-react";

import { Button } from "@/components/ui/button";

export function DatePickerPlaceholder() {
  return (
    <Button variant="outline" type="button" disabled>
      <CalendarClock className="size-4" />
      Pick date
    </Button>
  );
}
