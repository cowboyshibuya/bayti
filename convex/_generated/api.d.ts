/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounting from "../accounting.js";
import type * as activity from "../activity.js";
import type * as auth from "../auth.js";
import type * as bills from "../bills.js";
import type * as calendar from "../calendar.js";
import type * as documentFolders from "../documentFolders.js";
import type * as documents from "../documents.js";
import type * as events from "../events.js";
import type * as expenses from "../expenses.js";
import type * as households from "../households.js";
import type * as http from "../http.js";
import type * as lib_activity from "../lib/activity.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_validators from "../lib/validators.js";
import type * as members from "../members.js";
import type * as shopping from "../shopping.js";
import type * as tasks from "../tasks.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounting: typeof accounting;
  activity: typeof activity;
  auth: typeof auth;
  bills: typeof bills;
  calendar: typeof calendar;
  documentFolders: typeof documentFolders;
  documents: typeof documents;
  events: typeof events;
  expenses: typeof expenses;
  households: typeof households;
  http: typeof http;
  "lib/activity": typeof lib_activity;
  "lib/constants": typeof lib_constants;
  "lib/permissions": typeof lib_permissions;
  "lib/validators": typeof lib_validators;
  members: typeof members;
  shopping: typeof shopping;
  tasks: typeof tasks;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
