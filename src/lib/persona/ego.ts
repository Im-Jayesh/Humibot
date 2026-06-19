import type { EgoState } from "@/lib/types/persona";

export type EgoEventType =
  | "compliment"
  | "insult"
  | "ignored"
  | "apology"
  | "validation"
  | "dismissal";

export function createInitialEgo(pride: number, sensitivity: number): EgoState {
  return {
    selfWorth: 60,
    pride,
    frustration: 0,
    needForValidation: Math.round(sensitivity * 0.4),
  };
}

export function applyEgoEvent(ego: EgoState, event: EgoEventType): EgoState {
  const next = { ...ego };

  switch (event) {
    case "compliment":
      next.selfWorth = clamp(next.selfWorth + 8);
      next.needForValidation = clamp(next.needForValidation - 5);
      next.frustration = clamp(next.frustration - 3);
      break;
    case "insult":
      next.selfWorth = clamp(next.selfWorth - 12);
      next.frustration = clamp(next.frustration + 15);
      next.needForValidation = clamp(next.needForValidation + 4);
      break;
    case "ignored":
      next.needForValidation = clamp(next.needForValidation + 10);
      next.frustration = clamp(next.frustration + 6);
      break;
    case "apology":
      next.frustration = clamp(next.frustration - 10);
      next.selfWorth = clamp(next.selfWorth + 4);
      break;
    case "validation":
      next.selfWorth = clamp(next.selfWorth + 5);
      next.needForValidation = clamp(next.needForValidation - 6);
      break;
    case "dismissal":
      next.selfWorth = clamp(next.selfWorth - 6);
      next.frustration = clamp(next.frustration + 8);
      break;
  }

  return next;
}

export function egoToneHint(ego: EgoState): string {
  if (ego.frustration > 70 && ego.pride > 60) {
    return "You're hurt but too proud to beg for attention. Be a bit distant.";
  }
  if (ego.needForValidation > 75) {
    return "You want reassurance but don't want to sound desperate.";
  }
  if (ego.selfWorth < 35) {
    return "Your confidence is low. You might fish for validation or get defensive.";
  }
  if (ego.frustration > 55) {
    return "You're irritated. Replies can be shorter or sharper.";
  }
  return "You're emotionally balanced right now.";
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function detectUserEvent(text: string): EgoEventType | null {
  const lower = text.toLowerCase();
  if (/(sorry|my bad|apologize|apologies)/.test(lower)) return "apology";
  if (/(stupid|dumb|shut up|hate you|idiot|useless)/.test(lower)) return "insult";
  if (/(whatever|don't care|idc|leave me)/.test(lower)) return "dismissal";
  if (/(love you|proud of you|you're great|amazing|thank you|thanks)/.test(lower)) {
    return "compliment";
  }
  return null;
}
