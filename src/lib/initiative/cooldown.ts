import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { messages } from "@/lib/db/schema";

const COOLDOWN_MS = 20 * 60 * 1000;

export async function isInitiativeOnCooldown(userId: string) {
  const db = getDb();
  const [last] = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.userId, userId),
        eq(messages.role, "assistant"),
        eq(messages.isProactive, true)
      )
    )
    .orderBy(desc(messages.createdAt))
    .limit(1);

  if (!last?.createdAt) return false;
  return Date.now() - last.createdAt.getTime() < COOLDOWN_MS;
}
