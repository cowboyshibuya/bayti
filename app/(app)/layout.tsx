"use client";

import { ReactNode, useEffect } from "react";
import { useMutation } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { useConvexAuth } from "@convex-dev/auth/react";
import { AnimatePresence, motion } from "framer-motion";

import { api } from "@/convex/_generated/api";
import { AppHeader } from "@/components/app-shell/app-header";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { LoadingState } from "@/components/shared/loading-state";
import { HouseholdProvider, useHousehold } from "@/lib/household-context";

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

function hasUsableDisplayName(name: string | undefined) {
  const length = name?.trim().length ?? 0;
  return length >= 2 && length <= 80;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const syncCurrentUser = useMutation(api.users.syncCurrentUser);

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }

    void syncCurrentUser({});
  }, [isLoading, isAuthenticated, syncCurrentUser]);

  if (isLoading) {
    return <LoadingState label="Preparing FamilyOS" />;
  }

  if (!isAuthenticated) {
    router.replace("/login");
    return <LoadingState label="Preparing FamilyOS" />;
  }

  return (
    <HouseholdProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </HouseholdProvider>
  );
}

function AppLayoutContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { onboardingState } = useHousehold();

  useEffect(() => {
    if (!onboardingState || onboardingState.needsUserSync) {
      return;
    }

    const hasSelectedHousehold = Boolean(
      onboardingState.household && onboardingState.membership,
    );
    const hasHouseholds = onboardingState.households.length > 0;
    const hasCompletedProfile = Boolean(
      onboardingState.user?.profileSetupCompletedAt ||
        (hasHouseholds && hasUsableDisplayName(onboardingState.user?.name)),
    );
    const needsProfileSetup = !hasCompletedProfile;
    const onboardingMode =
      typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search).get("mode");
    const isExplicitHouseholdOnboarding =
      pathname === "/onboarding" &&
      (onboardingMode === "create" || onboardingMode === "join");

    if (needsProfileSetup && pathname !== "/profile/setup") {
      router.replace("/profile/setup");
      return;
    }

    if (
      !needsProfileSetup &&
      !hasHouseholds &&
      pathname !== "/onboarding"
    ) {
      router.replace("/onboarding");
      return;
    }

    if (
      !needsProfileSetup &&
      hasHouseholds &&
      !hasSelectedHousehold &&
      pathname !== "/households" &&
      !isExplicitHouseholdOnboarding
    ) {
      router.replace("/households");
      return;
    }

    if (
      hasSelectedHousehold &&
      (pathname === "/onboarding" ||
        pathname === "/profile/setup" ||
        pathname === "/households")
    ) {
      router.replace("/dashboard");
    }
  }, [onboardingState, pathname, router]);

  if (onboardingState === undefined) {
    return <LoadingState label="Preparing FamilyOS" />;
  }

  if (onboardingState.needsUserSync) {
    return <LoadingState label="Syncing your account" />;
  }

  if (!onboardingState.household || !onboardingState.membership) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(20,20,20,0.055),transparent_34%)] dark:bg-[radial-gradient(circle_at_50%_-10%,rgba(255,255,255,0.08),transparent_34%)]" />
      <div className="relative grid min-h-svh lg:grid-cols-[248px_1fr]">
        <aside className="hidden border-r border-sidebar-border bg-sidebar/80 backdrop-blur-2xl lg:block">
          <AppSidebar />
        </aside>
        <section className="min-w-0 bg-background">
          <AppHeader />
          <div className="pb-24 lg:pb-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
          <MobileNav />
        </section>
      </div>
    </div>
  );
}
