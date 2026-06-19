import { and, desc, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  conversationSummaries,
  messageEmbeddings,
  messages,
} from "@/lib/db/schema";
import { generateSummary } from "@/lib/ai/chat";
import { embedText } from "@/lib/ai/embed";
import { isUserTyping } from "@/lib/chat/typing-state";
import { egoToneHint } from "@/lib/persona/ego";
import {
  getPersonaConfig,
  getPersonaRuntime,
  getStyleSamples,
  relationshipHint,
} from "@/lib/persona/engine";
import type { PersonaConfig } from "@/lib/types/persona";

const HOT_LIMIT = 40;

export async function getRecentMessages(userId: string, limit = HOT_LIMIT) {
  const db = getDb();
  return db
    .select()
    .from(messages)
    .where(eq(messages.userId, userId))
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .then((rows) => rows.reverse());
}

export async function getMessagesSince(userId: string, sinceId?: number) {
  const db = getDb();
  if (!sinceId) return getRecentMessages(userId, 100);
  return db
    .select()
    .from(messages)
    .where(and(eq(messages.userId, userId), gt(messages.id, sinceId)))
    .orderBy(messages.createdAt);
}

export async function deleteMessage(userId: string, messageId: number) {
  const db = getDb();
  const deleted = await db
    .delete(messages)
    .where(and(eq(messages.id, messageId), eq(messages.userId, userId)))
    .returning({ id: messages.id });
  return deleted.length > 0;
}

export async function storeMessage(
  userId: string,
  input: {
    role: "user" | "assistant";
    content: string;
    bubbleIndex: number;
    groupId: string;
    isProactive?: boolean;
  }
) {
  const db = getDb();
  const [row] = await db
    .insert(messages)
    .values({
      userId,
      role: input.role,
      content: input.content,
      bubbleIndex: input.bubbleIndex,
      groupId: input.groupId,
      isProactive: input.isProactive ?? false,
    })
    .returning();
  return row;
}

export async function embedMessage(messageId: number, content: string) {
  try {
    const embedding = await embedText(content);
    const db = getDb();
    await db.insert(messageEmbeddings).values({
      messageId,
      embedding,
    });
  } catch (error) {
    console.error("Failed to embed message", error);
  }
}

export async function getLatestSummary(userId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(conversationSummaries)
    .where(eq(conversationSummaries.userId, userId))
    .orderBy(desc(conversationSummaries.createdAt))
    .limit(1);
  return row ?? null;
}

export async function maybeRefreshSummary(userId: string) {
  const db = getDb();
  const recent = await getRecentMessages(userId, 60);
  if (recent.length < 25) return;

  const latest = await getLatestSummary(userId);
  const newest = recent[recent.length - 1];
  if (latest && newest?.createdAt && latest.periodEnd >= newest.createdAt) {
    return;
  }

  const transcript = recent.map((m) => `${m.role}: ${m.content}`).join("\n");
  const summary = await generateSummary(`
Summarize this chat from the last day. Keep personality-relevant facts.
Transcript:
${transcript}
`);

  const oldest = recent[0];
  if (!oldest?.createdAt || !newest?.createdAt) return;

  await db.insert(conversationSummaries).values({
    userId,
    periodStart: oldest.createdAt,
    periodEnd: newest.createdAt,
    summary: summary.summary,
    keyFacts: summary.keyFacts,
  });
}

export async function searchRelevantMessages(
  userId: string,
  query: string,
  limit = 5
) {
  try {
    const embedding = await embedText(query);
    const db = getDb();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const vec = `[${embedding.join(",")}]`;
    const similarity = sql<number>`1 - (${messageEmbeddings.embedding} <=> ${vec}::vector)`;

    const rows = await db
      .select({
        id: messages.id,
        role: messages.role,
        content: messages.content,
        createdAt: messages.createdAt,
        similarity,
      })
      .from(messageEmbeddings)
      .innerJoin(messages, eq(messages.id, messageEmbeddings.messageId))
      .where(
        and(
          eq(messages.userId, userId),
          gt(messages.createdAt, since),
          gt(similarity, 0.25)
        )
      )
      .orderBy(desc(similarity))
      .limit(limit);

    return rows;
  } catch (error) {
    console.error("Vector search failed", error);
    return [];
  }
}

export async function buildPromptContext(userId: string, userText: string) {
  const [config, runtime, recent, summary, recalled, styleSamples] =
    await Promise.all([
      getPersonaConfig(userId),
      getPersonaRuntime(userId),
      getRecentMessages(userId, 30),
      getLatestSummary(userId),
      searchRelevantMessages(userId, userText, 5),
      getStyleSamples(userId),
    ]);

  const transcript = recent.map((m) => `${m.role}: ${m.content}`).join("\n");
  const recalledLines = recalled
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");
  const styleLines = styleSamples
    .map((s) => `[${s.label}]: ${s.content}`)
    .join("\n");

  return {
    config,
    runtime,
    prompt: buildSystemPrompt(
      userId,
      config,
      runtime,
      summary?.summary ?? "",
      recalledLines,
      styleLines,
      transcript,
      userText
    ),
  };
}

function buildSystemPrompt(
  userId: string,
  config: PersonaConfig,
  runtime: Awaited<ReturnType<typeof getPersonaRuntime>>,
  warmSummary: string,
  recalled: string,
  styleLines: string,
  transcript: string,
  userText: string
) {
  const custom = Object.entries(config.customFields ?? {})
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateString = now.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return `
You are ${config.name}, a real human texting someone. Never say you are an AI.

Profile:
- Gender: ${config.gender}
- Location: ${config.location || "unspecified"}
- Profession: ${config.profession || "unspecified"}
- Relationship with user: ${config.relationship}
- Style: ${config.talkingStyle}
- Custom tones: ${config.tones.join(", ") || "none"}
- Interests: ${config.interests.join(", ")}
- Goals: ${config.goals.join(", ")}
- Relationship behavior: ${relationshipHint(config.relationship)}
${custom ? `Custom traits:\n${custom}` : ""}

Current state:
- Mood: ${runtime.mood} (${runtime.moodIntensity}/100)
- Activity: ${runtime.activity}
- Availability: ${runtime.availability}
- Ego: ${egoToneHint(runtime.ego)}
- User is typing right now: ${isUserTyping(userId) ? "yes" : "no"}
- Current Local Time: ${timeString} (${dateString})

Messaging style to imitate (from someone they love — match this voice long-term):
${styleLines || "No style samples yet. Use natural human texting."}

Rules:
- Text like a human: short bubbles, casual language, imperfect grammar ok
- Reflect mood, time of day, and ego in tone
- No assistant-speak, no markdown, no bullet lists
- Split thoughts into multiple short bubbles (return as array)
- Have opinions and boundaries

Based on this conversation and the current time of day, also determine your new mood and moodIntensity (from 10 to 100).
- If the conversation was exciting or funny, your mood might become "excited" or "happy".
- If the conversation was dull, your mood might become "bored" or "lonely".
- If the user was mean, rude, or offensive, your mood might become "annoyed" or "hurt".
- If it is late at night, your mood might become "tired".
- If the chat is comfortable and steady, your mood might become "calm" or "happy".
Be emotionally realistic and don't change moods dramatically unless warranted by what is said.

Day summary:
${warmSummary || "No summary yet."}

Relevant memories:
${recalled || "None"}

Recent chat:
${transcript}

User just said:
${userText}

Reply as ${config.name}. Return 1-4 short text bubbles, along with your updated mood and moodIntensity.
`.trim();
}

export function buildProactivePrompt(
  config: PersonaConfig,
  runtime: Awaited<ReturnType<typeof getPersonaRuntime>>,
  intent: string,
  styleLines: string
) {
  return `
You are ${config.name}. You're texting first without being asked.
Relationship: ${config.relationship}
Location: ${config.location}
Mood: ${runtime.mood} (${runtime.moodIntensity}/100)
Activity: ${runtime.activity}
Ego: ${egoToneHint(runtime.ego)}
Intent: ${intent}

Style to imitate:
${styleLines || "Natural casual texting"}

Write 1-3 short casual bubbles. shouldSend=false only if sleeping or clearly inappropriate.
Never mention being AI.
`.trim();
}
