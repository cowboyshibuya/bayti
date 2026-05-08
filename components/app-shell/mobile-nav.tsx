"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { APP_NAVIGATION } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const mobileItems = APP_NAVIGATION.slice(0, 4);

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-background/88 px-2 pb-safe pt-2 backdrop-blur-2xl lg:hidden">
      {mobileItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
              className={cn(
              "relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-xs transition-colors",
              isActive
                ? "font-semibold text-foreground"
                : "text-foreground/42 hover:text-foreground/72",
            )}
          >
            {isActive && (
              <motion.div
                layoutId="mobile-nav-active"
                className="absolute inset-1 rounded-2xl border border-border bg-card shadow-[0_10px_28px_rgba(25,25,25,0.06)] dark:bg-white/[0.08]"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <item.icon className="relative z-10 size-4" />
            <span className="relative z-10">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
