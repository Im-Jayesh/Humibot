import type { PersonaConfig, PersonaRuntime } from "@/lib/types/persona";

const baseRate: Record<PersonaConfig["relationship"], number> = {
  friend: 18,
  crush: 24,
  partner: 22,
  sibling: 14,
  mentor: 10,
  rival: 12,
};

export function scoreInitiative(
  config: PersonaConfig,
  runtime: PersonaRuntime,
  now = new Date()
): { score: number; intent: string; reason: string } {
  let score = baseRate[config.relationship];

  if (runtime.availability === "sleeping") {
    return { score: 0, intent: "", reason: "sleeping" };
  }
  if (runtime.availability === "busy") score -= 12;

  const moodBoost: Record<PersonaRuntime["mood"], number> = {
    lonely: 20,
    bored: 14,
    anxious: 10,
    happy: 6,
    excited: 8,
    calm: 0,
    annoyed: -8,
    hurt: -4,
    tired: -10,
  };
  score += moodBoost[runtime.mood] ?? 0;

  if (runtime.wasIgnored) {
    score += 12;
    if (runtime.ego.pride > 65) score -= 8;
    if (runtime.ego.needForValidation > 70) score += 10;
  }

  if (runtime.lastInteractionAt) {
    const hours =
      (now.getTime() - new Date(runtime.lastInteractionAt).getTime()) / 3_600_000;
    if (hours > 4) score += 10;
    if (hours < 0.5) score -= 25;
  } else {
    score += 8;
  }

  score += Math.floor(Math.random() * 16) - 4;

  let intent = "casual check-in";
  if (runtime.mood === "lonely") intent = "reach out because you miss them";
  if (runtime.mood === "bored") intent = "share a random thought";
  if (runtime.ego.frustration > 60) intent = "subtle dig or dry text after feeling ignored";
  if (runtime.mood === "excited") intent = "share something exciting";
  if (runtime.mood === "hurt") intent = "test if they still care";

  return {
    score: Math.max(0, Math.min(100, score)),
    intent,
    reason: `mood=${runtime.mood}, availability=${runtime.availability}`,
  };
}
