import { randomUUID } from "crypto";
import { normalizeBubbles, typingDelayMs } from "@/lib/chat/bubbles";
import {
  buildPromptContext,
  buildProactivePrompt,
  embedMessage,
  maybeRefreshSummary,
  storeMessage,
} from "@/lib/memory/context";
import {
  generateProactivePlan,
  generateReplyPlan,
} from "@/lib/ai/chat";
import {
  drainPendingMessages,
  getPersonaConfig,
  getPersonaRuntime,
  getStyleSamples,
  onAssistantMessage,
  onUserMessage,
  queueUserMessage,
  setGenerating,
} from "@/lib/persona/engine";
import { sseHub } from "@/lib/sse/hub";
import { sendPushToUser } from "@/lib/push/web-push";

import { getDb } from "@/lib/db";
import { personaState } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { publishMoodShift } from "@/lib/persona/publish-mood";

export { queueUserMessage };

export async function handleUserMessage(userId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const groupId = randomUUID();
  const userRow = await storeMessage(userId, {
    role: "user",
    content: trimmed,
    bubbleIndex: 0,
    groupId,
  });

  if (userRow) {
    void embedMessage(userRow.id, trimmed);
    sseHub.publish({
      type: "message_bubble",
      userId,
      payload: {
        id: userRow.id,
        role: "user",
        content: trimmed,
        bubbleIndex: 0,
        groupId,
        createdAt: userRow.createdAt?.toISOString() ?? new Date().toISOString(),
      },
    });
  }

  await onUserMessage(userId, trimmed);
  await generateAssistantReply(userId, trimmed);
}

async function generateAssistantReply(userId: string, initialText: string) {
  await setGenerating(userId, true);
  try {
    let userText = initialText;
    let safety = 0;

    while (safety < 3) {
      safety += 1;
      const { config, runtime, prompt } = await buildPromptContext(
        userId,
        userText
      );
      sseHub.publish({ type: "typing_start", userId });

      const plan = await generateReplyPlan(prompt);
      const bubbles = normalizeBubbles(plan.bubbles);
      const groupId = randomUUID();

      // If the LLM determined a new mood, update it in the database and notify clients!
      if (plan.mood && plan.moodIntensity) {
        try {
          const db = getDb();
          const [row] = await db
            .select()
            .from(personaState)
            .where(eq(personaState.userId, userId))
            .limit(1);
          if (row) {
            await db
              .update(personaState)
              .set({
                mood: plan.mood,
                moodIntensity: plan.moodIntensity,
                updatedAt: new Date(),
              })
              .where(eq(personaState.id, row.id));

            publishMoodShift(plan.mood as any, plan.moodIntensity, userId);
          }
        } catch (error) {
          console.error("Failed to update mood from LLM plan:", error);
        }
      }

      for (let i = 0; i < bubbles.length; i += 1) {
        const delay = typingDelayMs(bubbles[i], runtime.mood, i);
        await sleep(delay);

        const row = await storeMessage(userId, {
          role: "assistant",
          content: bubbles[i],
          bubbleIndex: i,
          groupId,
        });

        if (row) {
          void embedMessage(row.id, bubbles[i]);
          sseHub.publish({
            type: "message_bubble",
            userId,
            payload: {
              id: row.id,
              role: "assistant",
              content: bubbles[i],
              bubbleIndex: i,
              groupId,
              createdAt:
                row.createdAt?.toISOString() ?? new Date().toISOString(),
            },
          });
        }
      }

      sseHub.publish({ type: "typing_stop", userId });
      await onAssistantMessage(userId);
      void maybeRefreshSummary(userId);

      const pending = await drainPendingMessages(userId);
      if (pending.length === 0) break;

      for (const extra of pending) {
        const extraGroupId = randomUUID();
        const extraRow = await storeMessage(userId, {
          role: "user",
          content: extra,
          bubbleIndex: 0,
          groupId: extraGroupId,
        });
        if (extraRow) {
          void embedMessage(extraRow.id, extra);
          sseHub.publish({
            type: "message_bubble",
            userId,
            payload: {
              id: extraRow.id,
              role: "user",
              content: extra,
              bubbleIndex: 0,
              groupId: extraGroupId,
              createdAt:
                extraRow.createdAt?.toISOString() ?? new Date().toISOString(),
            },
          });
        }
        await onUserMessage(userId, extra);
      }

      userText = `${userText}\n(they also said: ${pending.join(" / ")})`;
    }
  } finally {
    await setGenerating(userId, false);
  }
}

export async function sendProactiveMessage(userId: string, intent: string) {
  const [config, runtime, samples] = await Promise.all([
    getPersonaConfig(userId),
    getPersonaRuntime(userId),
    getStyleSamples(userId),
  ]);

  if (runtime.availability === "sleeping") {
    return { sent: false, reason: "sleeping" };
  }

  const styleLines = samples.map((s) => `[${s.label}]: ${s.content}`).join("\n");
  const prompt = buildProactivePrompt(config, runtime, intent, styleLines);
  const plan = await generateProactivePlan(prompt);
  if (!plan.shouldSend || plan.bubbles.length === 0) {
    return { sent: false, reason: "model_declined" };
  }

  const bubbles = normalizeBubbles(plan.bubbles);
  const groupId = randomUUID();

  for (let i = 0; i < bubbles.length; i += 1) {
    const delay = typingDelayMs(bubbles[i], runtime.mood, i);
    await sleep(delay);

    const row = await storeMessage(userId, {
      role: "assistant",
      content: bubbles[i],
      bubbleIndex: i,
      groupId,
      isProactive: true,
    });

    if (!row) continue;

    void embedMessage(row.id, bubbles[i]);
    const payload = {
      id: row.id,
      role: "assistant" as const,
      content: bubbles[i],
      bubbleIndex: i,
      groupId,
      isProactive: true,
      createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    };

    sseHub.publish({ type: "typing_start", userId });
    sseHub.publish({ type: "message_bubble", userId, payload });
    sseHub.publish({ type: "typing_stop", userId });

    await sendPushToUser(userId, {
      title: config.name,
      body: bubbles[i],
      url: "/",
    });
  }

  await onAssistantMessage(userId);
  return { sent: true, reason: intent };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
