import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  egoEvents,
  personaConfig,
  personaState,
  styleSamples,
} from "@/lib/db/schema";
import {
  applyEgoEvent,
  createInitialEgo,
  detectUserEvent,
} from "@/lib/persona/ego";
import {
  blendMoodWithTime,
  moodFromEvent,
} from "@/lib/persona/mood";
import { publishMoodShift } from "@/lib/persona/publish-mood";
import { resolveSchedule } from "@/lib/persona/schedule";
import {
  defaultPersonaConfig,
  defaultSchedule,
  type PersonaConfig,
  type PersonaRuntime,
  type ScheduleBlock,
  type StyleSample,
} from "@/lib/types/persona";

export async function ensurePersonaSeeded(userId: string) {
  const db = getDb();
  const [config] = await db
    .select()
    .from(personaConfig)
    .where(eq(personaConfig.userId, userId))
    .limit(1);
  const [state] = await db
    .select()
    .from(personaState)
    .where(eq(personaState.userId, userId))
    .limit(1);

  if (!config) {
    await db.insert(personaConfig).values({
      userId,
      ...defaultPersonaConfig,
    });
  }

  if (!state) {
    const cfg = config ?? defaultPersonaConfig;
    const schedule = resolveSchedule(defaultSchedule);
    await db.insert(personaState).values({
      userId,
      mood: "calm",
      moodIntensity: 50,
      ego: createInitialEgo(cfg.pride, cfg.sensitivity),
      availability: schedule.availability,
      activity: schedule.activity,
      schedule: defaultSchedule,
      lastInteractionAt: null,
      messagesSentToday: 0,
      wasIgnored: false,
      isGenerating: false,
      pendingMessages: [],
    });
  }
}

export async function getPersonaConfig(userId: string): Promise<PersonaConfig> {
  await ensurePersonaSeeded(userId);
  const db = getDb();
  const [row] = await db
    .select()
    .from(personaConfig)
    .where(eq(personaConfig.userId, userId))
    .limit(1);
  if (!row) return defaultPersonaConfig;
  return rowToConfig(row);
}

export async function getPersonaRuntime(
  userId: string
): Promise<PersonaRuntime & { schedule: ScheduleBlock[] }> {
  await ensurePersonaSeeded(userId);
  const db = getDb();
  const [row] = await db
    .select()
    .from(personaState)
    .where(eq(personaState.userId, userId))
    .limit(1);
  if (!row) throw new Error("Persona state missing");

  return {
    mood: row.mood as PersonaRuntime["mood"],
    moodIntensity: row.moodIntensity,
    ego: row.ego as PersonaRuntime["ego"],
    availability: row.availability as PersonaRuntime["availability"],
    activity: row.activity,
    lastInteractionAt: row.lastInteractionAt?.toISOString() ?? null,
    messagesSentToday: row.messagesSentToday,
    wasIgnored: row.wasIgnored,
    schedule: (row.schedule as ScheduleBlock[]) ?? defaultSchedule,
  };
}

export async function updatePersonaConfig(userId: string, config: PersonaConfig) {
  const db = getDb();
  await ensurePersonaSeeded(userId);
  const [row] = await db
    .select()
    .from(personaConfig)
    .where(eq(personaConfig.userId, userId))
    .limit(1);
  if (!row) return;

  await db
    .update(personaConfig)
    .set({
      name: config.name,
      gender: config.gender,
      relationship: config.relationship,
      talkingStyle: config.talkingStyle,
      location: config.location,
      profession: config.profession,
      warmth: config.warmth,
      humor: config.humor,
      directness: config.directness,
      sensitivity: config.sensitivity,
      pride: config.pride,
      interests: config.interests,
      goals: config.goals,
      tones: config.tones,
      customFields: config.customFields,
      updatedAt: new Date(),
    })
    .where(eq(personaConfig.id, row.id));

  const [state] = await db
    .select()
    .from(personaState)
    .where(eq(personaState.userId, userId))
    .limit(1);
  if (state) {
    const ego = state.ego as PersonaRuntime["ego"];
    await db
      .update(personaState)
      .set({
        ego: {
          ...ego,
          pride: config.pride,
          needForValidation: Math.round(config.sensitivity * 0.4),
        },
        updatedAt: new Date(),
      })
      .where(eq(personaState.id, state.id));
  }
}

export async function updateSchedule(userId: string, schedule: ScheduleBlock[]) {
  const db = getDb();
  await ensurePersonaSeeded(userId);
  const [row] = await db
    .select()
    .from(personaState)
    .where(eq(personaState.userId, userId))
    .limit(1);
  if (!row) return;
  const resolved = resolveSchedule(schedule);
  await db
    .update(personaState)
    .set({
      schedule,
      availability: resolved.availability,
      activity: resolved.activity,
      updatedAt: new Date(),
    })
    .where(eq(personaState.id, row.id));
}

export async function getStyleSamples(userId: string): Promise<StyleSample[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(styleSamples)
    .where(eq(styleSamples.userId, userId))
    .orderBy(desc(styleSamples.createdAt))
    .limit(50);
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    content: r.content,
    role: r.role,
  }));
}

export async function replaceStyleSamples(
  userId: string,
  samples: StyleSample[]
) {
  const db = getDb();
  await db.delete(styleSamples).where(eq(styleSamples.userId, userId));
  if (samples.length === 0) return;
  await db.insert(styleSamples).values(
    samples.map((s) => ({
      userId,
      label: s.label,
      content: s.content,
      role: s.role ?? "loved_one",
    }))
  );
}

export async function tickPersona(userId: string, now = new Date()) {
  const db = getDb();
  await ensurePersonaSeeded(userId);
  const runtime = await getPersonaRuntime(userId);
  const schedule = runtime.schedule;
  const resolved = resolveSchedule(schedule, now);
  const blended = blendMoodWithTime(
    { mood: runtime.mood, intensity: runtime.moodIntensity },
    now
  );

  let ego = runtime.ego;
  let wasIgnored = runtime.wasIgnored;
  if (runtime.lastInteractionAt) {
    const hoursSince =
      (now.getTime() - new Date(runtime.lastInteractionAt).getTime()) /
      3_600_000;
    if (hoursSince > 2) {
      wasIgnored = true;
      ego = applyEgoEvent(ego, "ignored");
    }
  }

  const [row] = await db
    .select()
    .from(personaState)
    .where(eq(personaState.userId, userId))
    .limit(1);
  if (!row) return;

  await db
    .update(personaState)
    .set({
      mood: blended.mood,
      moodIntensity: blended.intensity,
      ego,
      availability: resolved.availability,
      activity: resolved.activity,
      wasIgnored,
      lastTickAt: now,
      updatedAt: now,
    })
    .where(eq(personaState.id, row.id));

  publishMoodShift(blended.mood, blended.intensity, userId);

  return {
    runtime: {
      ...runtime,
      ...blended,
      ego,
      wasIgnored,
      ...resolved,
    },
  };
}

export async function onUserMessage(userId: string, text: string) {
  const db = getDb();
  const runtime = await getPersonaRuntime(userId);
  const event = detectUserEvent(text);
  let ego = runtime.ego;
  let mood = runtime.mood;
  let intensity = runtime.moodIntensity;

  if (event) {
    ego = applyEgoEvent(ego, event);
    const moodEvent =
      event === "compliment"
        ? "compliment"
        : event === "insult" || event === "dismissal"
          ? "insult"
          : event === "apology"
            ? "apology"
            : "fun_chat";
    const next = moodFromEvent(mood, intensity, moodEvent);
    mood = next.mood;
    intensity = next.intensity;

    await db.insert(egoEvents).values({
      userId,
      type: event,
      delta: 0,
      note: text.slice(0, 120),
    });
  } else {
    const next = moodFromEvent(mood, intensity, "fun_chat");
    mood = next.mood;
    intensity = next.intensity;
  }

  const timeBlend = blendMoodWithTime({ mood, intensity });
  mood = timeBlend.mood;
  intensity = timeBlend.intensity;

  const [row] = await db
    .select()
    .from(personaState)
    .where(eq(personaState.userId, userId))
    .limit(1);
  if (!row) return;

  await db
    .update(personaState)
    .set({
      mood,
      moodIntensity: intensity,
      ego,
      lastInteractionAt: new Date(),
      wasIgnored: false,
      messagesSentToday: row.messagesSentToday + 1,
      updatedAt: new Date(),
    })
    .where(eq(personaState.id, row.id));

  publishMoodShift(mood, intensity, userId);
}

export async function onAssistantMessage(userId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(personaState)
    .where(eq(personaState.userId, userId))
    .limit(1);
  if (!row) return;
  await db
    .update(personaState)
    .set({
      lastInteractionAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(personaState.id, row.id));
}

export async function setGenerating(userId: string, value: boolean) {
  const db = getDb();
  await db
    .update(personaState)
    .set({ isGenerating: value, updatedAt: new Date() })
    .where(eq(personaState.userId, userId));
}

export async function queueUserMessage(userId: string, text: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(personaState)
    .where(eq(personaState.userId, userId))
    .limit(1);
  if (!row?.isGenerating) return false;

  const pending = (row.pendingMessages as string[]) ?? [];
  await db
    .update(personaState)
    .set({
      pendingMessages: [...pending, text],
      updatedAt: new Date(),
    })
    .where(eq(personaState.id, row.id));
  return true;
}

export async function drainPendingMessages(userId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(personaState)
    .where(eq(personaState.userId, userId))
    .limit(1);
  if (!row) return [];

  const pending = (row.pendingMessages as string[]) ?? [];
  if (pending.length === 0) return [];

  await db
    .update(personaState)
    .set({ pendingMessages: [], updatedAt: new Date() })
    .where(eq(personaState.id, row.id));
  return pending;
}

export async function isGenerating(userId: string) {
  const db = getDb();
  const [row] = await db
    .select({ isGenerating: personaState.isGenerating })
    .from(personaState)
    .where(eq(personaState.userId, userId))
    .limit(1);
  return row?.isGenerating ?? false;
}

export function relationshipHint(relationship: PersonaConfig["relationship"]) {
  const map: Record<PersonaConfig["relationship"], string> = {
    friend: "Casual, warm, teases lightly, checks in often.",
    crush: "A bit nervous, flirty undertones, overthinks replies.",
    partner: "Intimate, honest, expects reciprocity.",
    sibling: "Blunt, playful roasting, comfortable silence.",
    mentor: "Thoughtful, asks guiding questions, supportive.",
    rival: "Competitive, sharp wit, hates losing arguments.",
  };
  return map[relationship];
}

function rowToConfig(row: typeof personaConfig.$inferSelect): PersonaConfig {
  return {
    name: row.name,
    gender: row.gender,
    relationship: row.relationship as PersonaConfig["relationship"],
    talkingStyle: row.talkingStyle as PersonaConfig["talkingStyle"],
    location: row.location ?? "",
    profession: row.profession ?? "",
    warmth: row.warmth,
    humor: row.humor,
    directness: row.directness,
    sensitivity: row.sensitivity,
    pride: row.pride,
    interests: row.interests ?? [],
    goals: row.goals ?? [],
    tones: row.tones ?? [],
    customFields: row.customFields ?? {},
  };
}

export async function listAllUserIds() {
  const db = getDb();
  const rows = await db
    .select({ id: personaState.userId })
    .from(personaState);
  return rows.map((r) => r.id);
}
