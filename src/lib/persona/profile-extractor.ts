import { eq } from "drizzle-orm";
import { generateObject } from "ai";
import { z } from "zod";
import { getChatModel } from "@/lib/ai/provider";
import { getDb } from "@/lib/db";
import { userProfile } from "@/lib/db/schema";

export type UserProfile = typeof userProfile.$inferSelect;

export async function ensureUserProfileSeeded(userId: string): Promise<UserProfile> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(userProfile)
    .values({
      userId,
      name: "",
      location: "",
      profession: "",
      facts: [],
    })
    .returning();

  return created;
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  return ensureUserProfileSeeded(userId);
}

export async function updateUserProfile(
  userId: string,
  patch: {
    name?: string;
    location?: string;
    profession?: string;
    facts?: string[];
  }
): Promise<UserProfile> {
  await ensureUserProfileSeeded(userId);
  const db = getDb();
  
  const [updated] = await db
    .update(userProfile)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(eq(userProfile.userId, userId))
    .returning();
    
  return updated;
}

export async function extractUserProfileUpdates(
  userId: string,
  userMessage: string
): Promise<void> {
  try {
    const profile = await getUserProfile(userId);
    
    const prompt = `
You are an information extraction assistant. Your job is to analyze a message sent by the user and extract updates to their profile.

Current User Profile:
- Name: ${profile.name || "not specified"}
- Location: ${profile.location || "not specified"}
- Profession: ${profile.profession || "not specified"}
- Known Facts:
${profile.facts.map((f) => `- ${f}`).join("\n") || "No facts known yet."}

User's message:
"${userMessage}"

Extract updates to their profile from the user's message if they explicitly mentioned any details about themselves.
- name: Extract if the user said their name, or if they corrected their name (e.g. "I'm John", "My name is Sarah", "Call me Alex").
- location: Extract if they mentioned where they live, reside, or are situated (e.g. "I live in Boston", "I'm in Paris right now").
- profession: Extract if they mentioned their job, studies, or role (e.g. "I work as a designer", "I'm a medical student", "I'm a freelancer").
- newFacts: A list of short, concise, and interesting personal facts, preferences, hobbies, or interests mentioned (e.g. "Loves black coffee", "Afraid of heights", "Has a cat named Oliver", "Plays the drums", "Vegan"). Only extract facts if they are clearly stated. Avoid generic statements or conversation filler.

Only return updates for fields that have new information in the message. Do not make up information or repeat existing facts. Return empty values or empty arrays if there is no new information.
`.trim();

    const { object } = await generateObject({
      model: getChatModel(),
      schema: z.object({
        name: z.string().optional(),
        location: z.string().optional(),
        profession: z.string().optional(),
        newFacts: z.array(z.string()).optional(),
      }),
      prompt,
    });

    const patch: {
      name?: string;
      location?: string;
      profession?: string;
      facts?: string[];
    } = {};

    if (object.name?.trim() && object.name.trim() !== profile.name) {
      patch.name = object.name.trim();
    }
    if (object.location?.trim() && object.location.trim() !== profile.location) {
      patch.location = object.location.trim();
    }
    if (object.profession?.trim() && object.profession.trim() !== profile.profession) {
      patch.profession = object.profession.trim();
    }

    if (object.newFacts && object.newFacts.length > 0) {
      const existingFactsLower = new Set(profile.facts.map((f) => f.toLowerCase().trim()));
      const filteredNewFacts = object.newFacts
        .map((f) => f.trim())
        .filter((f) => f.length > 0 && !existingFactsLower.has(f.toLowerCase()));
        
      if (filteredNewFacts.length > 0) {
        patch.facts = [...profile.facts, ...filteredNewFacts];
      }
    }

    // Only update if there are actual changes
    if (Object.keys(patch).length > 0) {
      console.log(`[Profile Extraction] Updating profile for user ${userId}:`, patch);
      await updateUserProfile(userId, patch);
    }
  } catch (error) {
    console.error(`[Profile Extraction] Failed to extract updates for user ${userId}:`, error);
  }
}
