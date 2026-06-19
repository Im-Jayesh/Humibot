import cron from "node-cron";
import { getDb } from "@/lib/db";
import { initiativeLog } from "@/lib/db/schema";
import { sendProactiveMessage } from "@/lib/chat/pipeline";
import { isInitiativeOnCooldown } from "@/lib/initiative/cooldown";
import { scoreInitiative } from "@/lib/initiative/scorer";
import {
  ensurePersonaSeeded,
  getPersonaConfig,
  getPersonaRuntime,
  listAllUserIds,
  tickPersona,
} from "@/lib/persona/engine";

let started = false;

export async function runInitiativeForAllUsers() {
  const userIds = await listAllUserIds();
  const results = [];

  for (const userId of userIds) {
    try {
      await ensurePersonaSeeded(userId);
      await tickPersona(userId);
      const [config, runtime] = await Promise.all([
        getPersonaConfig(userId),
        getPersonaRuntime(userId),
      ]);
      const result = scoreInitiative(config, runtime);
      const threshold = 58;
      const onCooldown = await isInitiativeOnCooldown(userId);
      const sent = !onCooldown && result.score >= threshold;

      const db = getDb();
      await db.insert(initiativeLog).values({
        userId,
        impulseScore: result.score,
        sent,
        reason: onCooldown ? "cooldown" : result.reason,
      });

      if (sent) {
        await sendProactiveMessage(userId, result.intent);
      }

      results.push({ userId, sent, score: result.score });
    } catch (error) {
      console.error(`Initiative tick failed for ${userId}`, error);
    }
  }

  return results;
}

export function startInitiativeScheduler() {
  if (started || process.env.VERCEL) return;
  started = true;

  cron.schedule("*/3 * * * *", () => {
    void runInitiativeForAllUsers();
  });
}
