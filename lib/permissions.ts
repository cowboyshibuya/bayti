import type { HouseholdRole } from "./constants";

export function canManageHousehold(role?: HouseholdRole) {
  return role === "admin";
}

export function canCreateHouseholdContent(role?: HouseholdRole) {
  return role === "admin" || role === "adult" || role === "child";
}

export function canCreateMoneyRecords(role?: HouseholdRole) {
  return role === "admin" || role === "adult";
}
