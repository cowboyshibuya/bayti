"use client";

import { FormEvent, useState } from "react";
import { useMutation } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  KeyRound,
  Loader2,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { api } from "@/convex/_generated/api";
import { BackButton } from "@/components/shared/back-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHousehold } from "@/lib/household-context";
import { householdOnboardingSchema, inviteCodeSchema } from "@/lib/validations";

type OnboardingMode = "choice" | "create" | "join";

const panelMotion = {
  initial: { opacity: 0, y: 14, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.98 },
};

export default function OnboardingPage() {
  const router = useRouter();
  const createHousehold = useMutation(api.households.createHousehold);
  const joinHousehold = useMutation(api.households.joinHousehold);
  const { setActiveHouseholdId } = useHousehold();
  const [mode, setMode] = useState<OnboardingMode>(() => {
    if (typeof window === "undefined") {
      return "choice";
    }

    const initialMode = new URLSearchParams(window.location.search).get("mode");
    return initialMode === "create" || initialMode === "join"
      ? initialMode
      : "choice";
  });
  const [workspaceName, setWorkspaceName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [pending, setPending] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizedInviteCode = inviteCode
    .trim()
    .toUpperCase()
    .replaceAll("-", "");
  const canCreate = workspaceName.trim().length >= 2;
  const canJoin = normalizedInviteCode.length === 8;

  function setCurrentMode(nextMode: OnboardingMode) {
    setError(null);
    setMode(nextMode);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("create");
    setError(null);

    const result = householdOnboardingSchema.safeParse({ name: workspaceName });

    if (!result.success) {
      setError("Workspace name must be between 2 and 80 characters.");
      setPending(null);
      return;
    }

    try {
      const householdId = await createHousehold({ name: result.data.name });
      setActiveHouseholdId(householdId);
      router.replace("/dashboard");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not create workspace.",
      );
    } finally {
      setPending(null);
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("join");
    setError(null);

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
      router.replace("/dashboard");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not join workspace.",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <main className="min-h-svh bg-[#fbfaf8] px-5 py-6 text-[#101014] sm:px-8 dark:bg-background dark:text-foreground">
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-5xl flex-col">
        <header className="flex h-12 items-center justify-end">
          <div className="flex items-center gap-2 rounded-full bg-black/[0.035] px-3 py-2 text-sm font-semibold text-black/70 dark:bg-white/[0.06] dark:text-foreground/70">
            <span className="flex size-6 items-center justify-center rounded-full bg-black text-white dark:bg-primary dark:text-primary-foreground">
              F
            </span>
            Bayti
          </div>
        </header>

        <div className="grid flex-1 place-items-center py-10">
          <AnimatePresence mode="wait">
            {mode === "choice" && (
              <motion.section
                key="choice"
                {...panelMotion}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="w-full max-w-3xl text-center"
              >
                <InviteIllustration />
                <p className="mt-8 text-sm font-semibold text-black/42 dark:text-foreground/42">
                  Welcome to Bayti
                </p>
                <h1 className="mt-3 text-balance text-4xl font-semibold tracking-normal sm:text-5xl">
                  Create or join a workspace
                </h1>
                <p className="mx-auto mt-4 max-w-xl text-balance text-sm leading-6 text-black/52 sm:text-base dark:text-foreground/52">
                  Start a private workspace for your household, or use an
                  invitation code to join an existing one.
                </p>

                <div className="mt-10 grid gap-3 sm:grid-cols-2">
                  <ChoiceAction
                    icon={Building2}
                    title="Create workspace"
                    description="Set up a private space and invite your household."
                    action="Start setup"
                    onClick={() => setCurrentMode("create")}
                  />
                  <ChoiceAction
                    icon={KeyRound}
                    title="Join workspace"
                    description="Enter an invitation code from another member."
                    action="Enter code"
                    onClick={() => setCurrentMode("join")}
                  />
                </div>
              </motion.section>
            )}

            {mode === "join" && (
              <motion.section
                key="join"
                {...panelMotion}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="w-full max-w-md text-center"
              >
                <InviteIllustration />
                <div className="mt-8 flex items-center justify-center gap-2">
                  <BackButton
                    onClick={() => setCurrentMode("choice")}
                    disabled={pending !== null}
                  />
                  <h1 className="min-w-0 text-3xl font-semibold tracking-normal">
                    Enter Invite Code
                  </h1>
                </div>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-black/54 dark:text-foreground/54">
                  Only invited users can access this workspace. Enter your code
                  to continue.
                </p>

                <form
                  onSubmit={handleJoin}
                  className="mt-9 grid gap-4 text-left"
                >
                  <div className="grid gap-2">
                    <Label
                      htmlFor="inviteCode"
                      className="text-xs text-black/74 dark:text-foreground/74"
                    >
                      Enter code
                    </Label>
                    <Input
                      id="inviteCode"
                      value={inviteCode}
                      onChange={(event) =>
                        setInviteCode(event.target.value.toUpperCase())
                      }
                      placeholder="Ex: PW66-34K2"
                      autoCapitalize="characters"
                      autoComplete="off"
                      maxLength={11}
                      className="h-12 rounded-2xl border-black/10 bg-white px-4 text-center text-base font-semibold tracking-[0.18em] text-black placeholder:text-left placeholder:tracking-normal placeholder:text-black/18 hover:border-black/16 hover:bg-white focus-visible:border-black/24 focus-visible:ring-black/8 dark:border-white/10 dark:bg-card dark:text-foreground dark:placeholder:text-foreground/22 dark:hover:border-white/16 dark:hover:bg-card dark:focus-visible:border-white/24"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={!canJoin || pending !== null}
                    className="h-12 rounded-2xl bg-black text-white shadow-none hover:bg-black/88 disabled:bg-black/[0.045] disabled:text-black/18 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 dark:disabled:bg-white/[0.06] dark:disabled:text-foreground/20"
                  >
                    {pending === "join" && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                    Verify Now
                  </Button>
                </form>

                <InlineError message={error} />
              </motion.section>
            )}

            {mode === "create" && (
              <motion.section
                key="create"
                {...panelMotion}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="w-full max-w-md text-center"
              >
                <CreateIllustration />
                <div className="mt-8 flex items-center justify-center gap-2">
                  <BackButton
                    onClick={() => setCurrentMode("choice")}
                    disabled={pending !== null}
                  />
                  <h1 className="min-w-0 text-3xl font-semibold tracking-normal">
                    Create Workspace
                  </h1>
                </div>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-black/54 dark:text-foreground/54">
                  Name your workspace. You can invite other members after setup.
                </p>

                <form
                  onSubmit={handleCreate}
                  className="mt-9 grid gap-4 text-left"
                >
                  <div className="grid gap-2">
                    <Label
                      htmlFor="workspaceName"
                      className="text-xs text-black/74 dark:text-foreground/74"
                    >
                      Workspace name
                    </Label>
                    <Input
                      id="workspaceName"
                      value={workspaceName}
                      onChange={(event) => setWorkspaceName(event.target.value)}
                      placeholder="Ex: Rivera workspace"
                      minLength={2}
                      maxLength={80}
                      className="h-12 rounded-2xl border-black/10 bg-white px-4 text-base font-semibold text-black placeholder:text-black/18 hover:border-black/16 hover:bg-white focus-visible:border-black/24 focus-visible:ring-black/8 dark:border-white/10 dark:bg-card dark:text-foreground dark:placeholder:text-foreground/22 dark:hover:border-white/16 dark:hover:bg-card dark:focus-visible:border-white/24"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={!canCreate || pending !== null}
                    className="h-12 rounded-2xl bg-black text-white shadow-none hover:bg-black/88 disabled:bg-black/[0.045] disabled:text-black/18 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 dark:disabled:bg-white/[0.06] dark:disabled:text-foreground/20"
                  >
                    {pending === "create" && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                    Create workspace
                  </Button>
                </form>

                <InlineError message={error} />
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

function ChoiceAction({
  icon: Icon,
  title,
  description,
  action,
  onClick,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className="group rounded-[1.75rem] border border-black/[0.08] bg-white p-5 text-left shadow-[0_24px_70px_rgba(30,30,30,0.07)] transition-colors hover:border-black/[0.14] dark:border-white/[0.09] dark:bg-card dark:shadow-[0_24px_70px_rgba(0,0,0,0.22)] dark:hover:border-white/[0.16]"
    >
      <span className="flex size-11 items-center justify-center rounded-2xl bg-[#f4f2ef] text-black dark:bg-muted dark:text-foreground">
        <Icon className="size-5" />
      </span>
      <h2 className="mt-6 text-xl font-semibold tracking-normal">{title}</h2>
      <p className="mt-2 min-h-12 text-sm leading-6 text-black/48 dark:text-foreground/48">
        {description}
      </p>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-black/70 transition-colors group-hover:text-black dark:text-foreground/70 dark:group-hover:text-foreground">
        {action}
        <ArrowRight className="size-4" />
      </span>
    </motion.button>
  );
}

function InviteIllustration() {
  return (
    <div className="relative mx-auto h-20 w-44">
      <span className="absolute left-3 top-7 rounded-full bg-[#f8f5ff] px-4 py-2 text-xs font-semibold text-[#6f5d98] shadow-[0_8px_24px_rgba(80,60,120,0.08)]">
        Thanks!
      </span>
      <span className="absolute right-0 top-1 rounded-full bg-[#f8f5ff] px-4 py-2 text-xs font-semibold text-[#6f5d98] shadow-[0_8px_24px_rgba(80,60,120,0.08)]">
        Love it!
      </span>
      <span className="absolute left-[72px] top-8 flex size-12 items-center justify-center rounded-full border-4 border-[#dfe4ff] bg-[#8c5d54] text-sm font-semibold text-white shadow-[0_12px_26px_rgba(75,80,140,0.12)]">
        A
      </span>
      <span className="absolute left-[98px] top-3 flex size-14 items-center justify-center rounded-full border-4 border-[#eee6bd] bg-[#e0b083] text-sm font-semibold text-white shadow-[0_12px_26px_rgba(75,80,140,0.12)]">
        M
      </span>
    </div>
  );
}

function CreateIllustration() {
  return (
    <div className="mx-auto flex size-20 items-center justify-center rounded-[2rem] bg-[#f4f2ef] text-black shadow-[0_18px_50px_rgba(30,30,30,0.08)] dark:bg-muted dark:text-foreground dark:shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
      <UsersRound className="size-8" />
    </div>
  );
}

function InlineError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-700 dark:border-destructive/25 dark:bg-destructive/10 dark:text-destructive">
      {message}
    </p>
  );
}
