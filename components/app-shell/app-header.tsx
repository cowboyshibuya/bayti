"use client";

import { Menu } from "lucide-react";
import { motion } from "framer-motion";

import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { HouseholdSwitcher } from "@/components/app-shell/household-switcher";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { QuickCreateDialog } from "@/components/shared/quick-create-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AppHeader() {
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
        <ThemeToggle />
        {/*<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <UserButton />
        </motion.div>*/}
      </div>
    </header>
  );
}
