"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarPlus,
  Check,
  Clock,
  Loader2,
  Send,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingState } from "@/components/shared/loading-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useHousehold } from "@/lib/household-context";
import { cn } from "@/lib/utils";

type StellaScope = "private" | "shared";

const panelMotion = {
  initial: { opacity: 0, y: 14, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.985 },
};

export default function StellaPage() {
  const { household, onboardingState } = useHousehold();
  const householdId = household?._id;
  const [scope, setScope] = useState<StellaScope>("private");
  const [conversationIdByScope, setConversationIdByScope] = useState<
    Partial<Record<StellaScope, Id<"stellaConversations">>>
  >({});
  const conversationId = conversationIdByScope[scope];
  const getConversation = useMutation(api.stella.getConversation);
  const sendMessage = useAction(api.stella.sendMessage);
  const confirmAction = useMutation(api.stella.confirmAction);
  const rejectAction = useMutation(api.stella.rejectAction);
  const clearPrivateConversation = useMutation(api.stella.clearPrivateConversation);
  const messages = useQuery(
    api.stella.listMessages,
    householdId ? { householdId, conversationId, limit: 100 } : "skip",
  );
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [actionPendingId, setActionPendingId] =
    useState<Id<"stellaMessages"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!householdId || conversationIdByScope[scope]) {
      return;
    }

    void getConversation({ householdId, scope }).then((conversation) => {
      setConversationIdByScope((current) => ({
        ...current,
        [scope]: conversation._id,
      }));
    });
  }, [conversationIdByScope, getConversation, householdId, scope]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages?.length, pending, scope]);

  const currentUser = onboardingState?.user;
  const canSend = input.trim().length > 0 && !pending && Boolean(householdId);
  const visibleMessages = messages ?? [];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!householdId || !canSend) return;

    const content = input.trim();
    setInput("");
    setPending(true);
    setError(null);

    try {
      const nextConversationId = await sendMessage({
        householdId,
        scope,
        content,
      });
      setConversationIdByScope((current) => ({
        ...current,
        [scope]: nextConversationId,
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Stella could not reply.");
      setInput(content);
    } finally {
      setPending(false);
    }
  }

  async function handleConfirmAction(messageId: Id<"stellaMessages">) {
    if (!householdId) return;
    setActionPendingId(messageId);
    setError(null);

    try {
      await confirmAction({ householdId, messageId });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not complete Stella action.",
      );
    } finally {
      setActionPendingId(null);
    }
  }

  async function handleRejectAction(messageId: Id<"stellaMessages">) {
    if (!householdId) return;
    setActionPendingId(messageId);
    setError(null);

    try {
      await rejectAction({ householdId, messageId });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not dismiss Stella action.",
      );
    } finally {
      setActionPendingId(null);
    }
  }

  async function handleClearPrivateConversation() {
    if (!householdId || pending || clearing) return;
    setClearing(true);
    setError(null);

    try {
      let hasMore = true;

      while (hasMore) {
        const result = await clearPrivateConversation({ householdId });
        hasMore = result.hasMore;
      }

      setClearDialogOpen(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not clear your private Stella chat.",
      );
    } finally {
      setClearing(false);
    }
  }

  if (!householdId || messages === undefined) {
    return <LoadingState label="Opening Stella" />;
  }

  return (
    <main className="min-h-[calc(100svh-3.5rem)] bg-[#fbfaf8] px-4 py-5 text-[#101014] sm:px-6 dark:bg-background dark:text-foreground">
      <div className="mx-auto flex min-h-[calc(100svh-6rem)] max-w-5xl flex-col">
        <motion.header
          {...panelMotion}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex flex-wrap items-center justify-between gap-4"
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-black/[0.035] px-3 py-2 text-sm font-semibold text-black/70 dark:bg-white/[0.06] dark:text-foreground/70">
              <span className="flex size-6 items-center justify-center rounded-full bg-black text-white dark:bg-primary dark:text-primary-foreground">
                <Sparkles className="size-3.5" />
              </span>
              Stella
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">
              Household assistant
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-black/54 dark:text-foreground/54">
              Ask Stella to summarize, plan, and prepare household actions for confirmation.
            </p>
          </div>

          <div className="grid rounded-[1.35rem] bg-black/[0.035] p-1 dark:bg-white/[0.06] sm:grid-cols-2">
            <ScopeButton
              active={scope === "private"}
              icon={UserRound}
              label="Private"
              onClick={() => setScope("private")}
            />
            <ScopeButton
              active={scope === "shared"}
              icon={UsersRound}
              label="Shared"
              onClick={() => setScope("shared")}
            />
          </div>
        </motion.header>

        <motion.section
          layout
          className="mt-6 flex min-h-[620px] flex-1 flex-col overflow-hidden rounded-[2rem] border border-black/[0.08] bg-white shadow-[0_24px_70px_rgba(30,30,30,0.07)] dark:border-white/[0.09] dark:bg-card dark:shadow-[0_24px_70px_rgba(0,0,0,0.22)]"
        >
          <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3 dark:border-white/[0.08]">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-[#f4f2ef] text-black dark:bg-muted dark:text-foreground">
                <Sparkles className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">Stella</p>
                <p className="text-xs text-black/42 dark:text-foreground/42">
                  {scope === "private"
                    ? "Only visible to you"
                    : `Shared with ${household.name}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {scope === "private" && visibleMessages.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setClearDialogOpen(true)}
                  disabled={pending || clearing}
                  className="h-9 rounded-2xl px-3 text-black/50 hover:bg-red-50 hover:text-red-700 disabled:opacity-40 dark:text-foreground/50 dark:hover:bg-destructive/10 dark:hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                  <span className="hidden sm:inline">Clear</span>
                </Button>
              )}
              {currentUser && (
                <UserAvatar
                  name={currentUser.name ?? currentUser.email ?? "Family member"}
                  imageUrl={currentUser.image}
                  className="size-8"
                />
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {visibleMessages.length === 0 ? (
              <EmptyStellaState scope={scope} />
            ) : (
              <div className="grid gap-4">
                <AnimatePresence initial={false}>
                  {visibleMessages.map((message) => (
                    <MessageBubble
                      key={message._id}
                      message={message}
                      pendingAction={actionPendingId === message._id}
                      onConfirm={() => handleConfirmAction(message._id)}
                      onReject={() => handleRejectAction(message._id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <p className="mx-4 mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-destructive/25 dark:bg-destructive/10 dark:text-destructive">
              {error}
            </p>
          )}

          <form
            onSubmit={handleSubmit}
            className="border-t border-black/[0.06] bg-[#fbfaf8] p-3 dark:border-white/[0.08] dark:bg-background"
          >
            <div className="flex items-end gap-2 rounded-[1.35rem] border border-black/10 bg-white p-2 shadow-[0_10px_34px_rgba(30,30,30,0.05)] dark:border-white/10 dark:bg-card">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder={
                  scope === "private"
                    ? "Ask Stella for private help..."
                    : "Ask Stella for the household..."
                }
                rows={1}
                className="max-h-36 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm font-medium outline-none placeholder:text-black/28 dark:placeholder:text-foreground/28"
              />
              <Button
                type="submit"
                disabled={!canSend}
                className="size-11 rounded-2xl bg-black p-0 text-white shadow-none hover:bg-black/88 disabled:bg-black/[0.045] disabled:text-black/18 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 dark:disabled:bg-white/[0.06] dark:disabled:text-foreground/20"
                aria-label="Send message"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </form>
        </motion.section>
      </div>

      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent className="rounded-[1.75rem] border-black/[0.08] bg-[#fbfaf8] sm:max-w-md dark:border-white/[0.09] dark:bg-card">
          <DialogHeader>
            <DialogTitle>Clear private Stella chat?</DialogTitle>
            <DialogDescription>
              This permanently deletes your private Stella messages for this household.
              Shared chat and any reminders or events Stella created will stay intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setClearDialogOpen(false)}
              disabled={clearing}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleClearPrivateConversation}
              disabled={clearing || pending}
              className="rounded-2xl bg-red-700 text-white hover:bg-red-800 dark:bg-destructive dark:text-destructive-foreground dark:hover:bg-destructive/90"
            >
              {clearing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Clear private chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function ScopeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof UserRound;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex h-10 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition-colors",
        active ? "text-black dark:text-foreground" : "text-black/42 dark:text-foreground/42",
      )}
    >
      {active && (
        <motion.span
          layoutId="stella-scope"
          className="absolute inset-0 rounded-2xl bg-white shadow-[0_10px_28px_rgba(30,30,30,0.08)] dark:bg-card"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      )}
      <Icon className="relative z-10 size-4" />
      <span className="relative z-10">{label}</span>
    </button>
  );
}

function EmptyStellaState({ scope }: { scope: StellaScope }) {
  return (
    <div className="grid min-h-[420px] place-items-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-w-md"
      >
        <div className="relative mx-auto h-24 w-44">
          <span className="absolute left-0 top-8 rounded-full bg-[#f8f5ff] px-4 py-2 text-xs font-semibold text-[#6f5d98] shadow-[0_8px_24px_rgba(80,60,120,0.08)]">
            Plans?
          </span>
          <span className="absolute right-0 top-1 rounded-full bg-[#f8f5ff] px-4 py-2 text-xs font-semibold text-[#6f5d98] shadow-[0_8px_24px_rgba(80,60,120,0.08)]">
            I’m here.
          </span>
          <span className="absolute left-[76px] top-8 flex size-14 items-center justify-center rounded-[1.4rem] border-4 border-[#eee6bd] bg-black text-white shadow-[0_12px_26px_rgba(75,80,140,0.12)]">
            <Sparkles className="size-6" />
          </span>
        </div>
        <h2 className="mt-6 text-2xl font-semibold tracking-normal">
          Start with Stella
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-black/50 dark:text-foreground/50">
          {scope === "private"
            ? "Use this space for private planning, reminders, and household questions."
            : "Use this shared space for plans and summaries everyone can see."}
        </p>
      </motion.div>
    </div>
  );
}

function MessageBubble({
  message,
  pendingAction,
  onConfirm,
  onReject,
}: {
  message: Doc<"stellaMessages">;
  pendingAction: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const content = getDisplayContent(message);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        "flex",
        isUser ? "justify-end" : "justify-start",
        isSystem && "justify-center",
      )}
    >
      <div
        className={cn(
          "max-w-[82%] rounded-[1.35rem] px-4 py-3 text-sm leading-6",
          isUser
            ? "bg-black text-white dark:bg-primary dark:text-primary-foreground"
            : isSystem
              ? "border border-black/[0.06] bg-[#f4f2ef] text-black/58 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-foreground/60"
              : message.status === "error"
                ? "border border-red-200 bg-red-50 text-red-700 dark:border-destructive/25 dark:bg-destructive/10 dark:text-destructive"
                : "border border-black/[0.07] bg-[#fbfaf8] text-black/76 dark:border-white/[0.08] dark:bg-background dark:text-foreground/76",
        )}
      >
        {message.status === "pending" ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Stella is thinking
          </span>
        ) : (
          <MessageContent content={content} rich={!isUser && !isSystem} />
        )}
        {message.proposedAction && (
          <ActionCard
            action={message.proposedAction}
            status={message.actionStatus}
            pending={pendingAction}
            onConfirm={onConfirm}
            onReject={onReject}
          />
        )}
      </div>
    </motion.div>
  );
}

function MessageContent({
  content,
  rich,
}: {
  content: string;
  rich: boolean;
}) {
  if (!rich) {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }

  const blocks = content.trim().split(/\n{2,}/);

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n");
        const isList = lines.every((line) => /^[-*]\s+/.test(line.trim()));

        if (isList) {
          return (
            <ul key={`${blockIndex}-${block}`} className="space-y-1 pl-4">
              {lines.map((line, lineIndex) => (
                <li
                  key={`${lineIndex}-${line}`}
                  className="list-disc pl-1 marker:text-black/35 dark:marker:text-foreground/35"
                >
                  {renderInlineMarkdown(line.trim().replace(/^[-*]\s+/, ""))}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`${blockIndex}-${block}`} className="whitespace-pre-wrap">
            {renderInlineMarkdown(block)}
          </p>
        );
      })}
    </div>
  );
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-black/88 dark:text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={index} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded-md border border-black/[0.06] bg-black/[0.04] px-1 py-0.5 text-[0.92em] dark:border-white/[0.08] dark:bg-white/[0.08]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
}

function getDisplayContent(message: Doc<"stellaMessages">) {
  if (message.role !== "assistant") {
    return message.content;
  }

  const content = unwrapJsonContent(message.content);

  try {
    const parsed = JSON.parse(content) as { reply?: unknown };

    if (typeof parsed.reply === "string" && parsed.reply.trim()) {
      return parsed.reply.trim();
    }
  } catch {
    return message.content;
  }

  return message.content;
}

function unwrapJsonContent(rawContent: string) {
  const content = rawContent.trim();
  const fenced = content.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return fenced?.[1]?.trim() ?? content;
}

function ActionCard({
  action,
  status,
  pending,
  onConfirm,
  onReject,
}: {
  action: NonNullable<Doc<"stellaMessages">["proposedAction"]>;
  status: Doc<"stellaMessages">["actionStatus"];
  pending: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const isDone = status === "completed" || status === "rejected";
  const isReminder = action.kind === "create_reminder";
  const time = isReminder ? action.remindAt : action.startsAt;

  return (
    <div className="mt-3 rounded-2xl border border-black/[0.08] bg-white p-3 text-black shadow-[0_12px_34px_rgba(30,30,30,0.06)] dark:border-white/[0.10] dark:bg-card dark:text-foreground">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#f4f2ef] dark:bg-muted">
          {isReminder ? <Clock className="size-4" /> : <CalendarPlus className="size-4" />}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-foreground/40">
            Stella action
          </p>
          <p className="mt-1 font-semibold">{action.title}</p>
          <p className="mt-1 text-xs text-black/48 dark:text-foreground/48">
            {new Date(time).toLocaleString()}
          </p>
        </div>
      </div>
      {!isDone ? (
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={pending}
            className="rounded-xl"
          >
            <X className="size-4" />
            Dismiss
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={pending}
            className="rounded-xl bg-black text-white hover:bg-black/88 dark:bg-primary dark:text-primary-foreground"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Confirm
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-xs font-semibold capitalize text-black/46 dark:text-foreground/46">
          {status}
        </p>
      )}
    </div>
  );
}
