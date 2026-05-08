"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Loader2, ShieldCheck, Sparkles, Users } from "lucide-react";


import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { MemberDisplay } from "@/components/shared/member-display";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const stellaSettings = useQuery(
    api.stella.getSettings,
    householdId ? { householdId } : "skip",
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
              <Sparkles className="size-4" />
              Stella
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!householdId || stellaSettings === undefined ? (
              <p className="text-sm text-muted-foreground">Loading Stella settings...</p>
            ) : (
              <StellaSettingsSection
                key={stellaSettings.modelId}
                householdId={householdId}
                canEdit={onboardingState.membership?.role === "admin"}
                settings={stellaSettings}
              />
            )}
          </CardContent>
        </Card>

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

function StellaSettingsSection({
  householdId,
  canEdit,
  settings,
}: {
  householdId: Id<"households">;
  canEdit: boolean;
  settings: {
    modelId: string;
    models: readonly {
      id: string;
      label: string;
      provider: string;
      description: string;
    }[];
  };
}) {
  const updateSettings = useMutation(api.stella.updateSettings);
  const [modelId, setModelId] = useState(settings.modelId);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selectedModel = settings.models.find((model) => model.id === modelId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    try {
      await updateSettings({ householdId, modelId });
      setMessage("Stella model updated.");
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "Could not update Stella settings.",
      );
    } finally {
      setPending(false);
    }
  }

  if (!canEdit) {
    return (
      <div className="grid gap-2">
        <p className="text-sm leading-6 text-muted-foreground">
          Stella uses {selectedModel?.label ?? settings.modelId}. Only admins can
          change the household model.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <p className="text-sm leading-6 text-muted-foreground">
          Choose the model Stella uses for household planning, summaries, and
          confirmed actions.
        </p>
        <Select value={modelId} onValueChange={setModelId}>
          <SelectTrigger className="h-12 rounded-2xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {settings.models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.provider} · {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedModel && (
          <p className="text-xs leading-5 text-muted-foreground">
            {selectedModel.description}
          </p>
        )}
      </div>
      {message && (
        <p className="rounded-2xl border border-border bg-muted/45 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </p>
      )}
      <Button
        type="submit"
        disabled={pending || modelId === settings.modelId}
        className="w-fit rounded-2xl"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Save Stella model
      </Button>
    </form>
  );
}
