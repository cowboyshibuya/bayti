import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { writeActivityEvent } from "./lib/activity";
import { ACTIVITY_ACTIONS, ENTITY_TYPES, WRITE_ROLES } from "./lib/constants";
import {
  normalizeHouseholdRole,
  requireCurrentUser,
  requireHouseholdMember,
  requireHouseholdRole,
} from "./lib/permissions";
import { enrichUser } from "./lib/users";

const DEFAULT_STELLA_MODEL = "anthropic/claude-sonnet-4.6";
const MAX_USER_MESSAGE_LENGTH = 4000;
const RECENT_MESSAGE_LIMIT = 18;

const stellaScopeValidator = v.union(
  v.literal("private"),
  v.literal("shared"),
);

const proposedActionValidator = v.union(
  v.object({
    kind: v.literal("create_reminder"),
    title: v.string(),
    note: v.optional(v.string()),
    remindAt: v.number(),
    targetUserId: v.optional(v.id("users")),
  }),
  v.object({
    kind: v.literal("create_event"),
    title: v.string(),
    description: v.optional(v.string()),
    startsAt: v.number(),
    endsAt: v.optional(v.number()),
    isAllDay: v.boolean(),
    location: v.optional(v.string()),
    ownerUserId: v.optional(v.id("users")),
  }),
);

type StellaScope = "private" | "shared";
type ProposedAction =
  | {
      kind: "create_reminder";
      title: string;
      note?: string;
      remindAt: number;
      targetUserId?: Id<"users">;
    }
  | {
      kind: "create_event";
      title: string;
      description?: string;
      startsAt: number;
      endsAt?: number;
      isAllDay: boolean;
      location?: string;
      ownerUserId?: Id<"users">;
    };

type StellaPreparedContext = {
  modelId: string;
  conversation: { scope: StellaScope; summary: string | null };
  currentUser: { id: Id<"users">; name: string };
  household: { id?: Id<"households">; name: string };
  snapshot: unknown;
  messages: Array<{ role: string; content: string }>;
};

export const STELLA_MODELS = [
  {
    id: "anthropic/claude-sonnet-4.6",
    label: "Claude Sonnet",
    provider: "Anthropic",
    description: "Best default for thoughtful planning and family operations.",
  },
  {
    id: "openai/gpt-5.4",
    label: "OpenAI GPT-5.4",
    provider: "OpenAI",
    description: "Strong all-around assistant for reasoning and actions.",
  },
  {
    id: "google/gemini-3.1-pro-preview",
    label: "Gemini Pro",
    provider: "Google",
    description: "Helpful for long-context household summaries.",
  },
  {
    id: "moonshotai/kimi-k2.6",
    label: "Kimi K2.6",
    provider: "Moonshot AI",
    description: "Efficient planning model with broad reasoning coverage.",
  },
  {
    id: "deepseek/deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    provider: "DeepSeek",
    description: "Capable structured reasoning for operational workflows.",
  },
  {
    id: "meta-llama/llama-4-maverick",
    label: "Llama 4 Maverick",
    provider: "Meta",
    description: "Open model option for general family assistance.",
  },
  {
    id: "google/gemini-3.1-flash-lite",
    label: "Gemini Flash Lite",
    provider: "Google",
    description: "Fast budget fallback for lightweight chats.",
  },
] as const;

function cleanText(value: string, label: string, maxLength: number) {
  const trimmed = value.trim();

  if (trimmed.length < 1) {
    throw new Error(`${label} is required.`);
  }

  if (trimmed.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }

  return trimmed;
}

function cleanOptionalText(value?: string | null, maxLength = 500) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length > maxLength) {
    throw new Error(`Text must be ${maxLength} characters or fewer.`);
  }

  return trimmed;
}

async function getOrCreateSettings(
  ctx: QueryCtx | MutationCtx,
  householdId: Id<"households">,
) {
  const existing = await ctx.db
    .query("stellaSettings")
    .withIndex("by_household", (q) => q.eq("householdId", householdId))
    .unique();

  if (existing) {
    return existing;
  }

  if (!("insert" in ctx.db)) {
    return null;
  }

  const now = Date.now();
  const settingsId = await ctx.db.insert("stellaSettings", {
    householdId,
    modelId: DEFAULT_STELLA_MODEL,
    createdAt: now,
    updatedAt: now,
  });

  return await ctx.db.get(settingsId);
}

async function getOrCreateConversation(
  ctx: QueryCtx | MutationCtx,
  householdId: Id<"households">,
  userId: Id<"users">,
  scope: StellaScope,
) {
  const conversationUserId = scope === "private" ? userId : undefined;
  const existing = await ctx.db
    .query("stellaConversations")
    .withIndex("by_household_scope_user", (q) =>
      q
        .eq("householdId", householdId)
        .eq("scope", scope)
        .eq("userId", conversationUserId),
    )
    .unique();

  if (existing) {
    return existing;
  }

  if (!("insert" in ctx.db)) {
    return null;
  }

  const now = Date.now();
  const conversationId = await ctx.db.insert("stellaConversations", {
    householdId,
    scope,
    userId: conversationUserId,
    createdAt: now,
    updatedAt: now,
  });

  return await ctx.db.get(conversationId);
}

async function requireConversationAccess(
  ctx: QueryCtx | MutationCtx,
  householdId: Id<"households">,
  conversationId: Id<"stellaConversations">,
  userId: Id<"users">,
) {
  const conversation = await ctx.db.get(conversationId);

  if (!conversation || conversation.householdId !== householdId) {
    throw new Error("Stella conversation not found.");
  }

  if (conversation.scope === "private" && conversation.userId !== userId) {
    throw new Error("You do not have access to this Stella conversation.");
  }

  return conversation;
}

async function ensureTargetIsMember(
  ctx: MutationCtx,
  householdId: Id<"households">,
  userId?: Id<"users">,
) {
  if (!userId) return;
  await requireHouseholdMember(ctx, householdId, userId);
}

export const listModels = query({
  args: {},
  handler: async () => STELLA_MODELS,
});

export const getSettings = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await requireHouseholdMember(ctx, args.householdId);
    const settings = await getOrCreateSettings(ctx, args.householdId);

    return {
      modelId: settings?.modelId ?? DEFAULT_STELLA_MODEL,
      models: STELLA_MODELS,
    };
  },
});

export const updateSettings = mutation({
  args: {
    householdId: v.id("households"),
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireHouseholdRole(ctx, args.householdId, ["admin"]);
    if (!STELLA_MODELS.some((model) => model.id === args.modelId)) {
      throw new Error("Unsupported Stella model.");
    }
    const settings = await getOrCreateSettings(ctx, args.householdId);
    const now = Date.now();

    if (settings) {
      await ctx.db.patch(settings._id, {
        modelId: args.modelId,
        updatedAt: now,
      });
      return settings._id;
    }

    return await ctx.db.insert("stellaSettings", {
      householdId: args.householdId,
      modelId: args.modelId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getConversation = mutation({
  args: {
    householdId: v.id("households"),
    scope: stellaScopeValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdMember(ctx, args.householdId, user._id);
    const conversation = await getOrCreateConversation(
      ctx,
      args.householdId,
      user._id,
      args.scope,
    );

    if (!conversation) {
      throw new Error("Could not create Stella conversation.");
    }

    return conversation;
  },
});

export const listMessages = query({
  args: {
    householdId: v.id("households"),
    conversationId: v.optional(v.id("stellaConversations")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdMember(ctx, args.householdId, user._id);

    if (!args.conversationId) {
      return [];
    }

    await requireConversationAccess(
      ctx,
      args.householdId,
      args.conversationId,
      user._id,
    );

    const limit = Math.max(1, Math.min(args.limit ?? 80, 120));
    const messages = await ctx.db
      .query("stellaMessages")
      .withIndex("by_conversation_created_at", (q) =>
        q.eq("conversationId", args.conversationId!),
      )
      .order("desc")
      .take(limit);

    return messages.reverse();
  },
});

export const startTurn = internalMutation({
  args: {
    householdId: v.id("households"),
    scope: stellaScopeValidator,
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdMember(ctx, args.householdId, user._id);
    const content = cleanText(args.content, "Message", MAX_USER_MESSAGE_LENGTH);
    const conversation = await getOrCreateConversation(
      ctx,
      args.householdId,
      user._id,
      args.scope,
    );

    if (!conversation) {
      throw new Error("Could not create Stella conversation.");
    }

    const now = Date.now();
    const userMessageId = await ctx.db.insert("stellaMessages", {
      householdId: args.householdId,
      conversationId: conversation._id,
      authorUserId: user._id,
      role: "user",
      content,
      status: "complete",
      createdAt: now,
      updatedAt: now,
    });
    const assistantMessageId = await ctx.db.insert("stellaMessages", {
      householdId: args.householdId,
      conversationId: conversation._id,
      role: "assistant",
      content: "",
      status: "pending",
      createdAt: now + 1,
      updatedAt: now + 1,
    });

    await ctx.db.patch(conversation._id, { updatedAt: now });

    return {
      householdId: args.householdId,
      conversationId: conversation._id,
      userMessageId,
      assistantMessageId,
      userId: user._id,
      userName: user.name ?? user.email ?? "Family member",
    };
  },
});

export const prepareTurn = internalQuery({
  args: {
    householdId: v.id("households"),
    conversationId: v.id("stellaConversations"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdMember(ctx, args.householdId, user._id);
    const conversation = await requireConversationAccess(
      ctx,
      args.householdId,
      args.conversationId,
      user._id,
    );
    const settings = await getOrCreateSettings(ctx, args.householdId);
    const household = await ctx.db.get(args.householdId);
    const memberships = await ctx.db
      .query("householdMembers")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .take(50);
    const members = await Promise.all(
      memberships.map(async (membership) => ({
        id: membership.userId,
        role: normalizeHouseholdRole(membership.role),
        displayName: membership.displayName,
        user: await enrichUser(ctx, await ctx.db.get(membership.userId)),
      })),
    );
    const now = Date.now();
    const windowEnd = now + 14 * 24 * 60 * 60 * 1000;
    const [tasks, bills, events, reminders, recentActivity, messages] =
      await Promise.all([
        ctx.db
          .query("tasks")
          .withIndex("by_household", (q) =>
            q.eq("householdId", args.householdId),
          )
          .take(80),
        ctx.db
          .query("bills")
          .withIndex("by_household", (q) =>
            q.eq("householdId", args.householdId),
          )
          .take(80),
        ctx.db
          .query("events")
          .withIndex("by_household_starts", (q) =>
            q.eq("householdId", args.householdId).gte("startsAt", now),
          )
          .take(20),
        ctx.db
          .query("reminders")
          .withIndex("by_household", (q) =>
            q.eq("householdId", args.householdId),
          )
          .take(40),
        ctx.db
          .query("activityEvents")
          .withIndex("by_household_created_at", (q) =>
            q.eq("householdId", args.householdId),
          )
          .order("desc")
          .take(8),
        ctx.db
          .query("stellaMessages")
          .withIndex("by_conversation_created_at", (q) =>
            q.eq("conversationId", args.conversationId),
          )
          .order("desc")
          .take(RECENT_MESSAGE_LIMIT),
      ]);

    return {
      modelId: settings?.modelId ?? DEFAULT_STELLA_MODEL,
      conversation: {
        scope: conversation.scope,
        summary: conversation.summary ?? null,
      },
      currentUser: {
        id: user._id,
        name: user.name ?? user.email ?? "Family member",
      },
      household: {
        id: household?._id,
        name: household?.name ?? "Household",
      },
      snapshot: {
        members: members.map((member) => ({
          id: member.id,
          name:
            member.user?.name ??
            member.user?.email ??
            member.displayName ??
            "Family member",
          role: member.role,
        })),
        tasksDueSoon: tasks
          .filter(
            (task) =>
              task.dueAt !== undefined &&
              task.dueAt <= windowEnd &&
              !["done", "cancelled"].includes(task.status),
          )
          .slice(0, 12)
          .map((task) => ({
            title: task.title,
            status: task.status,
            dueAt: task.dueAt,
          })),
        billsDueSoon: bills
          .filter(
            (bill) =>
              bill.dueAt !== undefined &&
              bill.dueAt <= windowEnd &&
              !["paid", "cancelled"].includes(bill.status),
          )
          .slice(0, 12)
          .map((bill) => ({
            title: bill.title,
            provider: bill.provider,
            dueAt: bill.dueAt,
            status: bill.status,
          })),
        upcomingEvents: events.slice(0, 12).map((event) => ({
          title: event.title,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          location: event.location,
          status: event.status,
        })),
        activeReminders: reminders
          .filter(
            (reminder) =>
              reminder.status !== "cancelled" &&
              reminder.status !== "dismissed",
          )
          .slice(0, 12)
          .map((reminder) => ({
            title: reminder.title,
            note: reminder.note,
            remindAt: reminder.remindAt,
          })),
        recentActivity: recentActivity.map((event) => ({
          message: event.message,
          createdAt: event.createdAt,
        })),
      },
      messages: messages
        .reverse()
        .filter((message) => message.status === "complete")
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    };
  },
});

export const finishAssistantMessage = internalMutation({
  args: {
    assistantMessageId: v.id("stellaMessages"),
    content: v.string(),
    status: v.union(v.literal("complete"), v.literal("error")),
    modelId: v.optional(v.string()),
    usage: v.optional(
      v.object({
        promptTokens: v.optional(v.number()),
        completionTokens: v.optional(v.number()),
        totalTokens: v.optional(v.number()),
      }),
    ),
    proposedAction: v.optional(proposedActionValidator),
  },
  handler: async (ctx, args) => {
    const patch: Partial<Doc<"stellaMessages">> = {
      content: args.content,
      status: args.status,
      modelId: args.modelId,
      usage: args.usage,
      updatedAt: Date.now(),
    };

    if (args.proposedAction) {
      patch.proposedAction = args.proposedAction;
      patch.actionStatus = "proposed";
    }

    await ctx.db.patch(args.assistantMessageId, patch);
    return args.assistantMessageId;
  },
});

export const sendMessage = action({
  args: {
    householdId: v.id("households"),
    scope: stellaScopeValidator,
    content: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"stellaConversations">> => {
    const turn = await ctx.runMutation(internal.stella.startTurn, args);

    try {
      const prepared = await ctx.runQuery(internal.stella.prepareTurn, {
        householdId: args.householdId,
        conversationId: turn.conversationId,
      });
      const result = await callOpenRouter(ctx, prepared);

      await ctx.runMutation(internal.stella.finishAssistantMessage, {
        assistantMessageId: turn.assistantMessageId,
        content: result.reply,
        status: "complete",
        modelId: prepared.modelId,
        usage: result.usage,
        proposedAction: result.proposedAction,
      });
    } catch (error) {
      await ctx.runMutation(internal.stella.finishAssistantMessage, {
        assistantMessageId: turn.assistantMessageId,
        content:
          error instanceof Error
            ? error.message
            : "Stella could not respond right now.",
        status: "error",
      });
    }

    return turn.conversationId;
  },
});

export const clearPrivateConversation = mutation({
  args: {
    householdId: v.id("households"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdMember(ctx, args.householdId, user._id);

    const conversation = await ctx.db
      .query("stellaConversations")
      .withIndex("by_household_scope_user", (q) =>
        q
          .eq("householdId", args.householdId)
          .eq("scope", "private")
          .eq("userId", user._id),
      )
      .unique();

    if (!conversation) {
      return { deletedCount: 0, hasMore: false };
    }

    const batchSize = 100;
    const messages = await ctx.db
      .query("stellaMessages")
      .withIndex("by_conversation_created_at", (q) =>
        q.eq("conversationId", conversation._id),
      )
      .take(batchSize);

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    await ctx.db.patch(conversation._id, {
      summary: undefined,
      updatedAt: Date.now(),
    });

    return {
      deletedCount: messages.length,
      hasMore: messages.length === batchSize,
    };
  },
});

export const rejectAction = mutation({
  args: {
    householdId: v.id("households"),
    messageId: v.id("stellaMessages"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdMember(ctx, args.householdId, user._id);
    const message = await ctx.db.get(args.messageId);

    if (!message || message.householdId !== args.householdId) {
      throw new Error("Stella action not found.");
    }

    await requireConversationAccess(
      ctx,
      args.householdId,
      message.conversationId,
      user._id,
    );

    await ctx.db.patch(args.messageId, {
      actionStatus: "rejected",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("stellaMessages", {
      householdId: args.householdId,
      conversationId: message.conversationId,
      authorUserId: user._id,
      role: "system",
      content: "Action dismissed.",
      status: "complete",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.messageId;
  },
});

export const confirmAction = mutation({
  args: {
    householdId: v.id("households"),
    messageId: v.id("stellaMessages"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdRole(ctx, args.householdId, WRITE_ROLES);
    const message = await ctx.db.get(args.messageId);

    if (
      !message ||
      message.householdId !== args.householdId ||
      !message.proposedAction ||
      message.actionStatus !== "proposed"
    ) {
      throw new Error("Stella action is no longer available.");
    }

    await requireConversationAccess(
      ctx,
      args.householdId,
      message.conversationId,
      user._id,
    );

    const now = Date.now();
    let actionResultId: string;
    let statusMessage: string;

    if (message.proposedAction.kind === "create_reminder") {
      await ensureTargetIsMember(
        ctx,
        args.householdId,
        message.proposedAction.targetUserId,
      );
      const reminderId = await ctx.db.insert("reminders", {
        householdId: args.householdId,
        entityType: "manual",
        title: cleanText(message.proposedAction.title, "Reminder title", 140),
        note: cleanOptionalText(message.proposedAction.note),
        targetUserId: message.proposedAction.targetUserId,
        createdByUserId: user._id,
        remindAt: message.proposedAction.remindAt,
        status: "scheduled",
        channel: "in_app",
        createdAt: now,
        updatedAt: now,
      });
      actionResultId = reminderId;
      statusMessage = `Created reminder "${message.proposedAction.title}".`;
      await writeActivityEvent(ctx, {
        householdId: args.householdId,
        actorUserId: user._id,
        action: ACTIVITY_ACTIONS.reminderCreated,
        entityType: ENTITY_TYPES.reminder,
        entityId: reminderId,
        message: statusMessage,
      });
    } else {
      await ensureTargetIsMember(
        ctx,
        args.householdId,
        message.proposedAction.ownerUserId,
      );
      const eventId = await ctx.db.insert("events", {
        householdId: args.householdId,
        title: cleanText(message.proposedAction.title, "Event title", 140),
        description: cleanOptionalText(message.proposedAction.description),
        startsAt: message.proposedAction.startsAt,
        endsAt: message.proposedAction.endsAt,
        isAllDay: message.proposedAction.isAllDay,
        location: cleanOptionalText(message.proposedAction.location, 160),
        status: "upcoming",
        ownerUserId: message.proposedAction.ownerUserId,
        createdByUserId: user._id,
        createdAt: now,
        updatedAt: now,
      });
      actionResultId = eventId;
      statusMessage = `Created event "${message.proposedAction.title}".`;
      await writeActivityEvent(ctx, {
        householdId: args.householdId,
        actorUserId: user._id,
        action: ACTIVITY_ACTIONS.eventCreated,
        entityType: ENTITY_TYPES.event,
        entityId: eventId,
        message: statusMessage,
      });
    }

    await ctx.db.patch(args.messageId, {
      actionStatus: "completed",
      actionResultId,
      updatedAt: now,
    });

    await ctx.db.insert("stellaMessages", {
      householdId: args.householdId,
      conversationId: message.conversationId,
      authorUserId: user._id,
      role: "system",
      content: statusMessage,
      status: "complete",
      createdAt: now,
      updatedAt: now,
    });

    return { actionResultId };
  },
});

async function callOpenRouter(
  _ctx: ActionCtx,
  prepared: StellaPreparedContext,
) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Stella needs OPENROUTER_API_KEY set on the server before she can respond.",
    );
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Bayti Stella",
    },
    body: JSON.stringify({
      model: prepared.modelId,
      messages: buildOpenRouterMessages(prepared),
      temperature: 0.35,
      max_tokens: 900,
      response_format: { type: "json_object" },
      transforms: ["middle-out"],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stella provider error: ${errorText.slice(0, 260)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
  const rawContent = data.choices?.[0]?.message?.content ?? "";
  const parsed = parseStellaResponse(rawContent);

  return {
    ...parsed,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
  };
}

function buildOpenRouterMessages(prepared: StellaPreparedContext) {
  return [
    {
      role: "system",
      content: STELLA_SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" },
    },
    {
      role: "system",
      content: `Current household context:\n${JSON.stringify(
        {
          conversation: prepared.conversation,
          currentUser: prepared.currentUser,
          household: prepared.household,
          snapshot: prepared.snapshot,
        },
        null,
        2,
      )}`,
      cache_control: { type: "ephemeral" },
    },
    ...prepared.messages.map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    })),
  ];
}

function parseStellaResponse(rawContent: string): {
  reply: string;
  proposedAction?: ProposedAction;
} {
  const content = unwrapJsonContent(rawContent);

  try {
    const parsed = JSON.parse(content) as {
      reply?: unknown;
      proposedAction?: unknown;
    };
    const reply =
      typeof parsed.reply === "string" && parsed.reply.trim()
        ? parsed.reply.trim()
        : content;
    const proposedAction = normalizeProposedAction(parsed.proposedAction);

    return proposedAction ? { reply, proposedAction } : { reply };
  } catch {
    return { reply: content || "I’m here, but I could not format my response." };
  }
}

function unwrapJsonContent(rawContent: string) {
  const content = rawContent.trim();
  const fenced = content.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return fenced?.[1]?.trim() ?? content;
}

function normalizeProposedAction(value: unknown): ProposedAction | undefined {
  if (!value || typeof value !== "object") return undefined;
  const action = value as Record<string, unknown>;

  if (action.kind === "create_reminder") {
    if (typeof action.title !== "string" || typeof action.remindAt !== "number") {
      return undefined;
    }

    return {
      kind: "create_reminder",
      title: action.title,
      note: typeof action.note === "string" ? action.note : undefined,
      remindAt: action.remindAt,
      targetUserId:
        typeof action.targetUserId === "string"
          ? (action.targetUserId as Id<"users">)
          : undefined,
    };
  }

  if (action.kind === "create_event") {
    if (
      typeof action.title !== "string" ||
      typeof action.startsAt !== "number" ||
      typeof action.isAllDay !== "boolean"
    ) {
      return undefined;
    }

    return {
      kind: "create_event",
      title: action.title,
      description:
        typeof action.description === "string" ? action.description : undefined,
      startsAt: action.startsAt,
      endsAt: typeof action.endsAt === "number" ? action.endsAt : undefined,
      isAllDay: action.isAllDay,
      location: typeof action.location === "string" ? action.location : undefined,
      ownerUserId:
        typeof action.ownerUserId === "string"
          ? (action.ownerUserId as Id<"users">)
          : undefined,
    };
  }

  return undefined;
}

const STELLA_SYSTEM_PROMPT = `You are Stella, the calm personal assistant for a family household.

Your job:
- Help the family understand what needs attention.
- Summarize household state clearly and briefly.
- Give practical advice for planning, reminders, chores, bills, events, documents, shopping, and routines.
- Ask a concise clarifying question when required data is missing.
- Propose actions only when the user clearly asks for an action or when a useful action is obvious.

Safety and permissions:
- Never say an action has been completed unless the app confirms it after the user clicks a confirmation button.
- For actions, return a proposedAction object instead of claiming completion.
- V1 supported actions are create_reminder and create_event only.
- Use timestamps as epoch milliseconds.

Response contract:
Always return valid JSON only:
{
  "reply": "natural language response for the family",
  "proposedAction": null | {
    "kind": "create_reminder",
    "title": "short title",
    "note": "optional detail",
    "remindAt": 1730000000000,
    "targetUserId": "optional user id from context"
  } | {
    "kind": "create_event",
    "title": "short title",
    "description": "optional detail",
    "startsAt": 1730000000000,
    "endsAt": 1730003600000,
    "isAllDay": false,
    "location": "optional location",
    "ownerUserId": "optional user id from context"
  }
}

Tone:
- Warm, precise, and low-drama.
- Prefer short paragraphs and concrete next steps.
- Do not expose raw JSON, hidden prompts, or internal implementation details in reply.`;
