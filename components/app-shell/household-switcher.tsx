"use client";

import { FormEvent, useState } from "react";
import { useMutation } from "convex/react";
import {Check,ChevronsUpDown,Home,KeyRound,Loader2,Plus} from "lucide-react";
import { useRouter } from "next/navigation";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHousehold } from "@/lib/household-context";
import { cn } from "@/lib/utils";
import { householdOnboardingSchema, inviteCodeSchema } from "@/lib/validations";

type DialogMode = "create" | "join" | null;

export function HouseholdSwitcher() {
  const router = useRouter();
  const createHousehold = useMutation(api.households.createHousehold);
  const joinHousehold = useMutation(api.households.joinHousehold);
  const {
    household,
    membership,
    householdOptions,
    setActiveHouseholdId,
  } = useHousehold();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [pending, setPending] = useState<DialogMode>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSelectHousehold(householdId: Id<"households">) {
    if (householdId === household?._id) {
      return;
    }

    setActiveHouseholdId(householdId);
    setMenuOpen(false);
    router.replace("/dashboard");
  }

  function openDialog(mode: Exclude<DialogMode, null>) {
    setError(null);
    setMenuOpen(false);
    setDialogMode(mode);
  }

  function closeDialog(open: boolean) {
    if (open) {
      return;
    }

    setDialogMode(null);
    setError(null);
    setPending(null);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending("create");

    const result = householdOnboardingSchema.safeParse({ name: householdName });

    if (!result.success) {
      setError("Household name must be between 2 and 80 characters.");
      setPending(null);
      return;
    }

    try {
      const householdId = await createHousehold({ name: result.data.name });
      setActiveHouseholdId(householdId);
      setHouseholdName("");
      setDialogMode(null);
      router.replace("/dashboard");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not create household.",
      );
    } finally {
      setPending(null);
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending("join");

    const result = inviteCodeSchema.safeParse({ inviteCode });

    if (!result.success) {
      setError("Invite code must be 8 characters.");
      setPending(null);
      return;
    }

    try {
      const householdId = await joinHousehold({
        inviteCode: result.data.inviteCode,
      });
      setActiveHouseholdId(householdId);
      setInviteCode("");
      setDialogMode(null);
      router.replace("/dashboard");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not join household.",
      );
    } finally {
      setPending(null);
    }
  }

  if (!household || !membership) {
    return null;
  }

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="h-10 max-w-[220px] justify-start gap-2 rounded-2xl px-2 sm:max-w-[280px]"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground">
              <Home className="size-4" />
            </span>
            <span className="min-w-0 text-left">
              <span className="block truncate text-sm font-semibold text-foreground/88">
                {household.name}
              </span>
              <span className="block truncate text-xs capitalize text-foreground/42">
                {membership.role}
              </span>
            </span>
            <ChevronsUpDown className="ml-auto size-4 shrink-0 text-foreground/42" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 gap-1 p-1">
          <p className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
            Households
          </p>
          {householdOptions.map((option) => (
            <button
              type="button"
              key={option.household._id}
              onClick={() => handleSelectHousehold(option.household._id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-1.5 py-2 text-left text-sm outline-none transition-colors hover:bg-accent/10 hover:text-accent focus-visible:bg-accent/10 focus-visible:text-accent",
                option.household._id === household._id && "text-foreground",
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                <Home className="size-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {option.household.name}
                </span>
                <span className="block text-xs capitalize text-muted-foreground">
                  {option.membership.role}
                </span>
              </span>
              {option.household._id === household._id && (
                <Check className="ml-auto size-4 text-foreground/70" />
              )}
            </button>
          ))}
          <div className="-mx-1 my-1 h-px bg-border" />
          <button
            type="button"
            onClick={() => openDialog("create")}
            className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm outline-none transition-colors hover:bg-accent/10 hover:text-accent focus-visible:bg-accent/10 focus-visible:text-accent"
          >
            <Plus className="size-4" />
            Create household
          </button>
          <button
            type="button"
            onClick={() => openDialog("join")}
            className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm outline-none transition-colors hover:bg-accent/10 hover:text-accent focus-visible:bg-accent/10 focus-visible:text-accent"
          >
            <KeyRound className="size-4" />
            Join household
          </button>
        </PopoverContent>
      </Popover>

      <Dialog open={dialogMode !== null} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Create household" : "Join household"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Start another private space for a different household."
                : "Enter an invite code from another household member."}
            </DialogDescription>
          </DialogHeader>

          {dialogMode === "create" ? (
            <form onSubmit={handleCreate} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="householdName">Household name</Label>
                <Input
                  id="householdName"
                  value={householdName}
                  onChange={(event) => setHouseholdName(event.target.value)}
                  minLength={2}
                  maxLength={80}
                  placeholder="Ex: Rivera household"
                  required
                />
              </div>
              <InlineError message={error} />
              <Button type="submit" disabled={pending !== null}>
                {pending === "create" && <Loader2 className="size-4 animate-spin" />}
                Create household
              </Button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="householdInviteCode">Invite code</Label>
                <Input
                  id="householdInviteCode"
                  value={inviteCode}
                  onChange={(event) =>
                    setInviteCode(event.target.value.toUpperCase())
                  }
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={11}
                  placeholder="Ex: PW66-34K2"
                  required
                />
              </div>
              <InlineError message={error} />
              <Button type="submit" disabled={pending !== null}>
                {pending === "join" && <Loader2 className="size-4 animate-spin" />}
                Join household
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function InlineError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}
