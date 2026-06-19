import type { Mood } from "@/lib/types/persona";

const moodTransitions: Record<Mood, Mood[]> = {
  happy: ["calm", "excited", "bored"],
  calm: ["happy", "bored", "tired"],
  bored: ["lonely", "annoyed", "calm"],
  lonely: ["anxious", "bored", "hurt"],
  anxious: ["calm", "annoyed", "hurt"],
  annoyed: ["hurt", "calm", "anxious"],
  hurt: ["annoyed", "lonely", "calm"],
  excited: ["happy", "tired", "calm"],
  tired: ["calm", "bored", "annoyed"],
};

export function moodFromTimeOfDay(
  hour: number
): { mood: Mood; intensity: number } {
  if (hour >= 0 && hour < 6) return { mood: "tired", intensity: 72 };
  if (hour >= 6 && hour < 9) return { mood: "calm", intensity: 48 };
  if (hour >= 9 && hour < 12) return { mood: "happy", intensity: 58 };
  if (hour >= 12 && hour < 14) return { mood: "calm", intensity: 52 };
  if (hour >= 14 && hour < 17) return { mood: "bored", intensity: 45 };
  if (hour >= 17 && hour < 20) return { mood: "excited", intensity: 62 };
  if (hour >= 20 && hour < 23) return { mood: "calm", intensity: 50 };
  return { mood: "tired", intensity: 58 };
}

export function blendMoodWithTime(
  current: { mood: Mood; intensity: number },
  now = new Date()
): { mood: Mood; intensity: number } {
  const timeMood = moodFromTimeOfDay(now.getHours());

  if (current.intensity >= 68) {
    return current;
  }

  if (Math.random() < 0.45) {
    return {
      mood: timeMood.mood,
      intensity: clamp(
        Math.round((timeMood.intensity + current.intensity) / 2),
        10,
        100
      ),
    };
  }

  return driftMood(current.mood, current.intensity);
}

export function driftMood(
  current: Mood,
  intensity: number
): { mood: Mood; intensity: number } {
  const options = moodTransitions[current];
  if (Math.random() > 0.35) {
    return {
      mood: current,
      intensity: clamp(intensity + randomDelta(), 10, 100),
    };
  }
  const next = options[Math.floor(Math.random() * options.length)] ?? current;
  return {
    mood: next,
    intensity: clamp(40 + Math.floor(Math.random() * 40), 10, 100),
  };
}

export function moodFromEvent(
  current: Mood,
  intensity: number,
  event: "compliment" | "insult" | "ignored" | "apology" | "fun_chat"
): { mood: Mood; intensity: number } {
  switch (event) {
    case "compliment":
      return { mood: "happy", intensity: clamp(intensity + 15, 10, 100) };
    case "insult":
      return { mood: "hurt", intensity: clamp(intensity + 20, 10, 100) };
    case "ignored":
      return { mood: "lonely", intensity: clamp(intensity + 12, 10, 100) };
    case "apology":
      return {
        mood:
          current === "hurt" || current === "annoyed" ? "calm" : current,
        intensity: clamp(intensity - 10, 10, 100),
      };
    case "fun_chat":
      return { mood: "happy", intensity: clamp(intensity + 8, 10, 100) };
    default:
      return { mood: current, intensity };
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function randomDelta() {
  return Math.floor(Math.random() * 7) - 3;
}

export function moodColor(mood: Mood): string {
  const map: Record<Mood, string> = {
    happy: "bg-emerald-400",
    calm: "bg-sky-400",
    bored: "bg-zinc-400",
    lonely: "bg-indigo-400",
    anxious: "bg-amber-400",
    annoyed: "bg-orange-500",
    hurt: "bg-rose-500",
    excited: "bg-fuchsia-400",
    tired: "bg-slate-400",
  };
  return map[mood];
}
