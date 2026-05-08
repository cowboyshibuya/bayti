"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Menu, Sparkles } from "lucide-react";
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

export function AppHeader() {
  const profile = useQuery(api.users.getCurrentProfile, {});
  const user = profile?.user;

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
          <Button
            asChild
            variant="ghost"
            className="h-10 rounded-2xl px-2"
            aria-label="Open profile"
          >
            <Link href="/profile">
              <UserAvatar
                name={user?.name ?? user?.email ?? "Family member"}
                imageUrl={profile?.profileImageUrl}
                className="size-8"
              />
              <span className="sr-only">Profile</span>
            </Link>
          </Button>
        </motion.div>
      </div>
    </header>
  );
}
