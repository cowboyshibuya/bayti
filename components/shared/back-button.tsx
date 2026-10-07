"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Place immediately before the modal or view title. */
export function BackButton({
  href,
  label = "Back",
  className,
  ...props
}: Omit<
  ComponentProps<typeof Button>,
  "children" | "asChild" | "variant" | "size"
> & {
  href?: string;
  label?: string;
}) {
  const shared = {
    ...props,
    variant: "ghost" as const,
    size: "icon" as const,
    animated: false,
    className: cn("size-11 shrink-0 text-foreground", className),
    "aria-label": label,
    title: label,
  };
  const icon = <ChevronLeft className="size-5" aria-hidden="true" />;
  return href ? (
    <Button {...shared} asChild>
      <Link href={href}>{icon}</Link>
    </Button>
  ) : (
    <Button type="button" {...shared}>
      {icon}
    </Button>
  );
}
