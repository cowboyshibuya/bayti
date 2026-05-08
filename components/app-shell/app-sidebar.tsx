"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useHousehold } from "@/lib/household-context";

import { APP_NAVIGATION } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();
  const { household } = useHousehold();
  const inboxCount = useQuery(
    api.inbox.count,
    household?._id ? { householdId: household._id } : "skip",
  );

  return (
    <div className="flex h-full min-h-svh flex-col p-3">
      <Link href="/" className="flex items-center gap-2 rounded-2xl px-3 py-3 text-foreground/88">
        <span className="flex size-8 items-center justify-center rounded-2xl bg-muted text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <Home className="size-4" />
        </span>
        <span className="font-heading text-base font-semibold tracking-normal">FamilyOS</span>
      </Link>

      <nav className="mt-5 grid gap-1">
        {APP_NAVIGATION.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex h-10 items-center gap-3 rounded-2xl px-3 text-sm transition-colors",
                isActive
                  ? "font-semibold text-foreground"
                  : "text-foreground/46 hover:bg-muted/70 hover:text-foreground/78",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-2xl border border-border bg-card shadow-[0_10px_26px_rgba(25,25,25,0.06)] dark:bg-white/[0.08] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon className="relative z-10 size-4" />
              <span className="relative z-10">{item.label}</span>
              {item.href === "/inbox" && inboxCount !== undefined && inboxCount > 0 && (
                <span className="relative z-10 ml-auto rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
                  {Math.min(inboxCount, 99)}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
