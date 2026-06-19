import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db";
import { initiativeLog } from "@/lib/db/schema";
import { scoreInitiative } from "@/lib/initiative/scorer";
import { isInitiativeOnCooldown } from "@/lib/initiative/cooldown";
import { sendProactiveMessage } from "@/lib/chat/pipeline";
import {
  ensurePersonaSeeded,
  getPersonaConfig,
  getPersonaRuntime,
  tickPersona,
} from "@/lib/persona/engine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({}));
    const forceSend = Boolean(body.forceSend);
    const bypassCooldown = Boolean(body.bypassCooldown);

    await ensurePersonaSeeded(user.id);
    await tickPersona(user.id);

    const [config, runtime] = await Promise.all([
      getPersonaConfig(user.id),
      getPersonaRuntime(user.id),
    ]);

    const result = scoreInitiative(config, runtime);
    const threshold = 58;
    const onCooldown = await isInitiativeOnCooldown(user.id);

    let sent = false;
    let reason = result.reason;

    if (forceSend) {
      sent = true;
      reason = "forced_by_user";
    } else if (onCooldown && !bypassCooldown) {
      sent = false;
      reason = "cooldown";
    } else if (result.score < threshold) {
      sent = false;
      reason = `score_below_threshold (${result.score} < ${threshold})`;
    } else {
      sent = true;
    }

    const db = getDb();
    await db.insert(initiativeLog).values({
      userId: user.id,
      impulseScore: result.score,
      sent,
      reason,
    });

    if (sent) {
      await sendProactiveMessage(user.id, result.intent);
    }

    return NextResponse.json({
      ok: true,
      score: result.score,
      threshold,
      intent: result.intent,
      onCooldown,
      sent,
      reason,
      runtimeMood: runtime.mood,
      runtimeMoodIntensity: runtime.moodIntensity,
      runtimeAvailability: runtime.availability,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Test initiative failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
