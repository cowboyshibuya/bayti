"use client";

import { useQuery } from "convex/react";
import { ShieldCheck, Users } from "lucide-react";


import { api } from "@/convex/_generated/api";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { MemberDisplay } from "@/components/shared/member-display";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHousehold } from "@/lib/household-context";

export default function SettingsPage() {
  const { onboardingState, household } = useHousehold();
  const householdId = household?._id;
  const members = useQuery(
    api.members.list,
    householdId && onboardingState?.membership?.role === "admin"
      ? { householdId }
      : "skip",
  );

  if (onboardingState === undefined) {
    return <LoadingState label="Loading settings" />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div>
        <p className="text-sm text-muted-foreground">
          {household?.name}
        </p>
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      <div className="mt-6 grid gap-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="size-4" />
              Household permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Admins can manage household settings and members. Adults can create
              bills and expenses. Any non-viewer member can create tasks and notes.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="size-4" />
              Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            {onboardingState.membership?.role !== "admin" ? (
              <EmptyState
                title="Admin access required"
                description="Only household admins can manage members."
                icon={ShieldCheck}
              />
            ) : members === undefined ? (
              <p className="text-sm text-muted-foreground">Loading members...</p>
            ) : (
              <div className="divide-y rounded-xl border">
                {members.map(({ membership, user }) => (
                  <div
                    key={membership._id}
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <MemberDisplay
                      member={{ membership, user }}
                      detail={user?.email ?? "No email"}
                    />
                    <Badge variant="secondary">{membership.role}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
