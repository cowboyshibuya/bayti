"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  async function handleSignOut() {
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
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-10 rounded-2xl px-2"
                aria-label="Open account menu"
              >
                <UserAvatar
                  name={user?.name ?? user?.email ?? "Family member"}
                  imageUrl={profile?.profileImageUrl}
                  className="size-8"
                />
                <span className="sr-only">Account menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
              <DropdownMenuLabel className="px-2 py-2">
                <span className="block truncate text-sm font-semibold">
                  {user?.name ?? "Family member"}
                </span>
                <span className="block truncate text-xs font-normal text-muted-foreground">
                  {user?.email ?? "Signed in"}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="rounded-xl">
                <Link href="/profile">
                  <UserRound className="size-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                className="rounded-xl"
                onClick={handleSignOut}
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>
      </div>
    </header>
  );
}
