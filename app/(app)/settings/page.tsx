"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import {
  Home,
  Loader2,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";


import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ThemePreference } from "@/components/settings/theme-preference";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { MemberDisplay } from "@/components/shared/member-display";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHousehold } from "@/lib/household-context";

export default function SettingsPage() {
  const { onboardingState, household, setActiveHouseholdId } = useHousehold();
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
            <CardTitle className="text-sm">Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <ThemePreference />
          </CardContent>
        </Card>

        {household && onboardingState.membership && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Home className="size-4" />
                Household
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HouseholdSettingsSection
                household={household}
                role={onboardingState.membership.role}
                setActiveHouseholdId={setActiveHouseholdId}
              />
            </CardContent>
          </Card>
        )}

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

function HouseholdSettingsSection({
  household,
  role,
  setActiveHouseholdId,
}: {
  household: {
    _id: Id<"households">;
    name: string;
  };
  role: string;
  setActiveHouseholdId: (householdId: Id<"households"> | null) => void;
}) {
  const router = useRouter();
  const updateHouseholdName = useMutation(api.households.updateHouseholdName);
  const leaveHousehold = useMutation(api.households.leaveHousehold);
  const resetHouseholdData = useMutation(api.households.resetHouseholdData);
  const deleteHousehold = useMutation(api.households.deleteHousehold);
  const canEdit = role === "admin";
  const [name, setName] = useState(household.name);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<
    "rename" | "leave" | "reset" | "delete" | null
  >(null);
  const [confirming, setConfirming] = useState<
    "leave" | "reset" | "delete" | null
  >(null);

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = name.trim();

    if (trimmed.length < 2 || trimmed.length > 80) {
      setMessage("Household name must be between 2 and 80 characters.");
      return;
    }

    setPending("rename");
    setMessage(null);

    try {
      await updateHouseholdName({ householdId: household._id, name: trimmed });
      setMessage("Household name updated.");
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "Could not update household name.",
      );
    } finally {
      setPending(null);
    }
  }

  async function handleLeave() {
    setPending("leave");
    setMessage(null);

    try {
      await leaveHousehold({ householdId: household._id });
      setActiveHouseholdId(null);
      setConfirming(null);
      router.replace("/dashboard");
      router.refresh();
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : "Could not exit household.",
      );
    } finally {
      setPending(null);
    }
  }

  async function handleReset(confirmationName: string) {
    setPending("reset");
    setMessage(null);

    try {
      await resetHouseholdData({
        householdId: household._id,
        confirmationName,
      });
      setConfirming(null);
      setMessage("Household data reset.");
      router.refresh();
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : "Could not reset household.",
      );
    } finally {
      setPending(null);
    }
  }

  async function handleDelete(confirmationName: string) {
    setPending("delete");
    setMessage(null);

    try {
      await deleteHousehold({
        householdId: household._id,
        confirmationName,
      });
      setActiveHouseholdId(null);
      setConfirming(null);
      router.replace("/dashboard");
      router.refresh();
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : "Could not delete household.",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <div className="grid gap-5">
        <div className="flex flex-col gap-3 rounded-2xl border bg-muted/25 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">{household.name}</p>
            <p className="text-xs capitalize text-muted-foreground">
              Your role: {role}
            </p>
          </div>
          <Badge variant="secondary" className="w-fit capitalize">
            {canEdit ? "Admin controls" : "Member access"}
          </Badge>
        </div>

        {canEdit ? (
          <form onSubmit={handleRename} className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="householdName">Household name</Label>
              <Input
                id="householdName"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={80}
                className="h-12 rounded-2xl"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={pending !== null || name.trim() === household.name}
              className="w-fit rounded-2xl"
            >
              {pending === "rename" && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Save household name
            </Button>
          </form>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            Only admins can rename, reset, or delete this household.
          </p>
        )}

        {message && (
          <p className="rounded-2xl border border-border bg-muted/45 px-4 py-3 text-sm text-muted-foreground">
            {message}
          </p>
        )}

        <div className="grid gap-3 border-t pt-4 sm:grid-cols-3">
          <Button
            type="button"
            variant="outline"
            disabled={pending !== null}
            onClick={() => setConfirming("leave")}
            className="justify-start rounded-2xl"
          >
            <LogOut className="size-4" />
            Exit household
          </Button>
          {canEdit && (
            <>
              <Button
                type="button"
                variant="destructive"
                disabled={pending !== null}
                onClick={() => setConfirming("reset")}
                className="justify-start rounded-2xl"
              >
                <RotateCcw className="size-4" />
                Reset data
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending !== null}
                onClick={() => setConfirming("delete")}
                className="justify-start rounded-2xl"
              >
                <Trash2 className="size-4" />
                Delete household
              </Button>
            </>
          )}
        </div>
      </div>

      <ConfirmHouseholdActionDialog
        open={confirming === "leave"}
        onOpenChange={(open) => !open && setConfirming(null)}
        title="Exit household?"
        description="You will lose access to this household. The last admin cannot exit until another admin exists."
        actionLabel="Exit household"
        pending={pending === "leave"}
        onConfirm={handleLeave}
      />
      <ConfirmHouseholdActionDialog
        open={confirming === "reset"}
        onOpenChange={(open) => !open && setConfirming(null)}
        title="Reset household data?"
        description="This permanently clears household app data while keeping members and the household itself."
        actionLabel="Reset data"
        householdName={household.name}
        pending={pending === "reset"}
        onConfirm={handleReset}
      />
      <ConfirmHouseholdActionDialog
        open={confirming === "delete"}
        onOpenChange={(open) => !open && setConfirming(null)}
        title="Delete household?"
        description="This permanently deletes the household, its members, and all household data."
        actionLabel="Delete household"
        householdName={household.name}
        pending={pending === "delete"}
        onConfirm={handleDelete}
      />
    </>
  );
}

function ConfirmHouseholdActionDialog({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  householdName,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  actionLabel: string;
  householdName?: string;
  pending: boolean;
  onConfirm: (confirmationName: string) => Promise<void> | void;
}) {
  const [confirmationName, setConfirmationName] = useState("");
  const requiresName = householdName !== undefined;
  const canConfirm =
    !pending && (!requiresName || confirmationName.trim() === householdName);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setConfirmationName("");
    }

    onOpenChange(nextOpen);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canConfirm) {
      return;
    }

    await onConfirm(confirmationName);
    setConfirmationName("");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {requiresName && (
            <div className="grid gap-2">
              <Label htmlFor={`confirm-${actionLabel.replaceAll(" ", "-")}`}>
                {`Type "${householdName}" to confirm`}
              </Label>
              <Input
                id={`confirm-${actionLabel.replaceAll(" ", "-")}`}
                value={confirmationName}
                onChange={(event) => setConfirmationName(event.target.value)}
                autoComplete="off"
                className="h-12 rounded-2xl"
              />
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={!canConfirm}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {actionLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
