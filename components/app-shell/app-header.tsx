"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { LogOut, Menu, Sparkles, UserRound } from "lucide-react";
import { motion } from "framer-motion";

import { api } from "@/convex/_generated/api";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { HouseholdSwitcher } from "@/components/app-shell/household-switcher";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { QuickCreateDialog } from "@/components/shared/quick-create-dialog";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useHousehold } from "@/lib/household-context";

export function AppHeader() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const { setActiveHouseholdId } = useHousehold();
  const profile = useQuery(api.users.getCurrentProfile, {});
  const user = profile?.user;
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!accountMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  async function handleSignOut() {
    setAccountMenuOpen(false);
    setActiveHouseholdId(null);
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background/82 px-4 backdrop-blur-2xl sm:px-6">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[286px] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <AppSidebar />
          </SheetContent>
        </Sheet>
        <HouseholdSwitcher />
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:block">
          <QuickCreateDialog />
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button
            asChild
            variant="ghost"
            className="h-10 gap-2 rounded-2xl px-3"
          >
            <Link href="/stella">
              <Sparkles className="size-4" />
              <span className="hidden md:inline">Stella</span>
            </Link>
          </Button>
        </motion.div>
        <ThemeToggle />
        <div ref={accountMenuRef} className="relative">
          <Button
            type="button"
            variant="ghost"
            animated={false}
            className="h-10 rounded-2xl px-2"
            aria-label="Open account menu"
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
            onClick={() => setAccountMenuOpen((open) => !open)}
          >
            <UserAvatar
              name={user?.name ?? user?.email ?? "Family member"}
              imageUrl={profile?.profileImageUrl}
              className="size-8"
            />
            <span className="sr-only">Account menu</span>
          </Button>
          {accountMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl bg-popover p-2 text-popover-foreground ring-1 ring-foreground/10 [box-shadow:var(--shadow-elevated)] animate-in fade-in-0 zoom-in-95 slide-in-from-top-1"
            >
              <div className="px-2 py-2">
                <span className="block truncate text-sm font-semibold">
                  {user?.name ?? "Family member"}
                </span>
                <span className="block truncate text-xs font-normal text-muted-foreground">
                  {user?.email ?? "Signed in"}
                </span>
              </div>
              <div className="-mx-2 my-1 h-px bg-border" />
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setAccountMenuOpen(false)}
                className="relative flex cursor-pointer items-center gap-1.5 rounded-xl px-1.5 py-1 text-sm outline-hidden select-none hover:bg-accent/10 hover:text-accent focus-visible:bg-accent/10 focus-visible:text-accent"
              >
                  <UserRound className="size-4" />
                  Profile
              </Link>
              <button
                type="button"
                role="menuitem"
                className="relative flex w-full cursor-pointer items-center gap-1.5 rounded-xl px-1.5 py-1 text-left text-sm text-destructive outline-hidden select-none hover:bg-destructive/10 focus-visible:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
