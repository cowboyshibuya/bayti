"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Home,
  KeyRound,
  type LucideIcon,
  Plus,
  UsersRound,
} from "lucide-react";

import type { Id } from "@/convex/_generated/dataModel";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { useHousehold } from "@/lib/household-context";

const panelMotion = {
  initial: { opacity: 0, y: 14, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

export default function HouseholdSelectionPage() {
  const router = useRouter();
  const { onboardingState, householdOptions, setActiveHouseholdId } =
    useHousehold();

  if (onboardingState === undefined) {
    return <LoadingState label="Loading households" />;
  }

  function selectHousehold(householdId: Id<"households">) {
    setActiveHouseholdId(householdId);
    router.replace("/dashboard");
  }

  function openOnboarding(mode: "create" | "join") {
    setActiveHouseholdId(null);
    router.push(`/onboarding?mode=${mode}`);
  }

  return (
    <main className="min-h-svh bg-[#fbfaf8] px-5 py-6 text-[#101014] sm:px-8 dark:bg-background dark:text-foreground">
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-5xl flex-col">
        <header className="flex h-12 items-center justify-center">
          <div className="flex items-center gap-2 rounded-full bg-black/[0.035] px-3 py-2 text-sm font-semibold text-black/70 dark:bg-white/[0.06] dark:text-foreground/70">
            <span className="flex size-6 items-center justify-center rounded-full bg-black text-white dark:bg-primary dark:text-primary-foreground">
              <Home className="size-3.5" />
            </span>
            Bayti
          </div>
        </header>

        <div className="grid flex-1 place-items-center py-10">
          <motion.section
            {...panelMotion}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full max-w-3xl text-center"
          >
            <HouseholdIllustration />
            <p className="mt-8 text-sm font-semibold text-black/42 dark:text-foreground/42">
              Choose your workspace
            </p>
            <h1 className="mt-3 text-balance text-4xl font-semibold tracking-normal sm:text-5xl">
              Where should we open?
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-balance text-sm leading-6 text-black/52 sm:text-base dark:text-foreground/52">
              Pick one of your households to continue. You can switch again
              from the header any time.
            </p>

            <div className="mt-10 grid gap-3 text-left">
              {householdOptions.map(({ household, membership }) => (
                <motion.button
                  key={household._id}
                  type="button"
                  onClick={() => selectHousehold(household._id)}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.985 }}
                  className="group flex w-full items-center gap-4 rounded-[2rem] border border-black/8 bg-white/78 p-4 text-left shadow-[0_18px_55px_rgba(30,30,30,0.07)] backdrop-blur-xl transition-colors hover:border-black/14 hover:bg-white dark:border-white/10 dark:bg-card/80 dark:hover:border-white/16 dark:hover:bg-card"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-[1.35rem] bg-[#f4f2ef] text-black dark:bg-muted dark:text-foreground">
                    <Building2 className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold text-black/88 dark:text-foreground">
                      {household.name}
                    </span>
                    <span className="block text-sm capitalize text-black/45 dark:text-foreground/45">
                      {membership.role}
                    </span>
                  </span>
                  <ArrowRight className="size-5 shrink-0 text-black/30 transition-colors group-hover:text-black/70 dark:text-foreground/30 dark:group-hover:text-foreground/70" />
                </motion.button>
              ))}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <SecondaryAction
                icon={Plus}
                label="Create household"
                onClick={() => openOnboarding("create")}
              />
              <SecondaryAction
                icon={KeyRound}
                label="Join with invite"
                onClick={() => openOnboarding("join")}
              />
            </div>
          </motion.section>
        </div>
      </div>
    </main>
  );
}

function SecondaryAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="h-12 rounded-2xl border-black/10 bg-white/62 text-black/72 shadow-none hover:bg-white dark:border-white/10 dark:bg-card/70 dark:text-foreground/72 dark:hover:bg-card"
    >
      <Icon className="size-4" />
      {label}
    </Button>
  );
}

function HouseholdIllustration() {
  return (
    <div className="relative mx-auto h-24 w-48">
      <span className="absolute left-0 top-8 flex size-16 items-center justify-center rounded-[1.75rem] bg-[#f4f2ef] text-black shadow-[0_18px_50px_rgba(30,30,30,0.08)] dark:bg-muted dark:text-foreground dark:shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
        <UsersRound className="size-7" />
      </span>
      <span className="absolute left-20 top-0 flex size-20 items-center justify-center rounded-[2rem] border-[6px] border-[#eee6bd] bg-white text-black shadow-[0_22px_60px_rgba(30,30,30,0.10)] dark:border-white/12 dark:bg-card dark:text-foreground dark:shadow-[0_22px_60px_rgba(0,0,0,0.28)]">
        <Home className="size-8" />
      </span>
      <span className="absolute right-0 top-11 flex size-14 items-center justify-center rounded-[1.5rem] bg-[#f8f5ff] text-[#6f5d98] shadow-[0_12px_34px_rgba(80,60,120,0.08)] dark:bg-white/[0.08] dark:text-foreground/72">
        <Building2 className="size-6" />
      </span>
    </div>
  );
}
