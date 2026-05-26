"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const ACTIVE_HOUSEHOLD_STORAGE_KEY = "bayti.activeHouseholdId";
const LEGACY_ACTIVE_HOUSEHOLD_STORAGE_KEY = "familyos.activeHouseholdId";
const ACTIVE_HOUSEHOLD_CHANGED_EVENT = "bayti.activeHouseholdChanged";

type OnboardingState = FunctionReturnType<typeof api.households.getOnboardingState>;

type HouseholdContextValue = {
  activeHouseholdId: Id<"households"> | null;
  setActiveHouseholdId: (householdId: Id<"households"> | null) => void;
  onboardingState: OnboardingState | undefined;
  household: NonNullable<OnboardingState["household"]> | null;
  membership: NonNullable<OnboardingState["membership"]> | null;
  householdOptions: OnboardingState["households"];
};

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

function readStoredHouseholdId() {
  if (typeof window === "undefined") {
    return null;
  }

  const storedHouseholdId = window.localStorage.getItem(
    ACTIVE_HOUSEHOLD_STORAGE_KEY,
  );

  if (storedHouseholdId) {
    return storedHouseholdId as Id<"households">;
  }

  const legacyHouseholdId = window.localStorage.getItem(
    LEGACY_ACTIVE_HOUSEHOLD_STORAGE_KEY,
  );

  if (legacyHouseholdId) {
    window.localStorage.setItem(
      ACTIVE_HOUSEHOLD_STORAGE_KEY,
      legacyHouseholdId,
    );
    window.localStorage.removeItem(LEGACY_ACTIVE_HOUSEHOLD_STORAGE_KEY);
    return legacyHouseholdId as Id<"households">;
  }

  return null;
}

function subscribeToStoredHouseholdId(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(ACTIVE_HOUSEHOLD_CHANGED_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(ACTIVE_HOUSEHOLD_CHANGED_EVENT, onStoreChange);
  };
}

function writeStoredHouseholdId(householdId: Id<"households"> | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (householdId) {
    window.localStorage.setItem(ACTIVE_HOUSEHOLD_STORAGE_KEY, householdId);
  } else {
    window.localStorage.removeItem(ACTIVE_HOUSEHOLD_STORAGE_KEY);
  }

  window.dispatchEvent(new Event(ACTIVE_HOUSEHOLD_CHANGED_EVENT));
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const activeHouseholdId = useSyncExternalStore(
    subscribeToStoredHouseholdId,
    readStoredHouseholdId,
    () => null,
  );

  const onboardingState = useQuery(
    api.households.getOnboardingState,
    { activeHouseholdId },
  );

  const setActiveHouseholdId = useCallback(
    (householdId: Id<"households"> | null) => {
      writeStoredHouseholdId(householdId);
    },
    [],
  );

  const value = useMemo<HouseholdContextValue>(
    () => ({
      activeHouseholdId,
      setActiveHouseholdId,
      onboardingState,
      household: onboardingState?.household ?? null,
      membership: onboardingState?.membership ?? null,
      householdOptions: onboardingState?.households ?? [],
    }),
    [activeHouseholdId, onboardingState, setActiveHouseholdId],
  );

  return (
    <HouseholdContext.Provider value={value}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const value = useContext(HouseholdContext);

  if (!value) {
    throw new Error("useHousehold must be used inside HouseholdProvider.");
  }

  return value;
}
