import { sseHub } from "@/lib/sse/hub";
import type { Mood } from "@/lib/types/persona";

export function publishMoodShift(
  mood: Mood,
  intensity: number,
  userId: string
) {
  sseHub.publish({
    type: "mood_shift",
    userId,
    payload: { mood, intensity },
  });
}
