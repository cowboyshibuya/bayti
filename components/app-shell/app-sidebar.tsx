"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { AccountMenu } from "@/components/app-shell/account-menu";
import { HouseholdSwitcher } from "@/components/app-shell/household-switcher";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useHousehold } from "@/lib/household-context";

import { APP_NAVIGATION } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppSidebar({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { household } = useHousehold();
  const inboxCount = useQuery(
    api.inbox.count,
    household?._id ? { householdId: household._id } : "skip",
  );

  return (
    <div className={cn("flex min-h-0 flex-col p-3", mobile ? "h-full" : "sticky top-0 h-svh")}>
      <div className={cn("shrink-0", mobile && "pr-9")}>
        <HouseholdSwitcher className="w-full max-w-none sm:max-w-none" onNavigate={onNavigate} />
      </div>

      <nav aria-label="Main navigation" className="mt-5 grid min-h-0 flex-1 content-start gap-1 overflow-y-auto">
        {APP_NAVIGATION.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "relative flex h-10 items-center gap-3 rounded-2xl px-3 text-sm transition-colors",
                isActive
                  ? "font-semibold text-foreground"
                  : "text-foreground/46 hover:bg-muted/70 hover:text-foreground/78",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId={mobile ? "mobile-sidebar-active" : "sidebar-active"}
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
      <footer className="mt-3 shrink-0 border-t border-sidebar-border pt-3 pb-[env(safe-area-inset-bottom)]">
        <AccountMenu expanded onNavigate={onNavigate} />
      </footer>
    </div>
  );
}
