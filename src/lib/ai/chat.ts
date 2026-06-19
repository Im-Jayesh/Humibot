import { generateObject } from "ai";
import { z } from "zod";
import { getChatModel } from "@/lib/ai/provider";
import { moodSchema } from "@/lib/types/persona";

export async function generateReplyPlan(prompt: string) {
  const { object } = await generateObject({
    model: getChatModel(),
    schema: z.object({
      bubbles: z.array(z.string()).min(1).max(6),
      moodNote: z.string().optional(),
      mood: moodSchema.optional(),
      moodIntensity: z.number().min(0).max(100).optional().transform((val) => {
        if (val !== undefined && val > 0 && val <= 1) {
          return Math.round(val * 100);
        }
        return val;
      }),
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
