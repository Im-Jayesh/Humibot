import { generateObject } from "ai";
import { ollama } from "ai-sdk-ollama";
import { z } from "zod";

const chatModel = process.env.OLLAMA_CHAT_MODEL ?? "gemma4:e2b";

export function getChatModel() {
  return ollama(chatModel);
}

export async function generateReplyPlan(prompt: string) {
  const { object } = await generateObject({
    model: getChatModel(),
    schema: z.object({
      bubbles: z.array(z.string()).min(1).max(6),
      moodNote: z.string().optional(),
    }),
    prompt,
  });
  return object;
}

export async function generateProactivePlan(prompt: string) {
  const { object } = await generateObject({
    model: getChatModel(),
    schema: z.object({
      shouldSend: z.boolean(),
      intent: z.string(),
      bubbles: z.array(z.string()).min(1).max(4),
    }),
    prompt,
  });
  return object;
}

export async function generateSummary(prompt: string) {
  const { object } = await generateObject({
    model: getChatModel(),
    schema: z.object({
      summary: z.string(),
      keyFacts: z.array(z.string()).max(12),
    }),
    prompt,
  });
  return object;
}
