export function splitIntoBubbles(text: string, maxLen = 120): string[] {
  const cleaned = text.trim();
  if (!cleaned) return [];

  const sentences = cleaned
    .split(/(?<=[.!?…])\s+/)
    .flatMap((part) => splitLongPart(part, maxLen))
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) return [cleaned.slice(0, maxLen)];
  return sentences;
}

export function normalizeBubbles(bubbles: string[]): string[] {
  return bubbles
    .flatMap((bubble) => splitIntoBubbles(bubble))
    .filter(Boolean);
}

function splitLongPart(part: string, maxLen: number): string[] {
  if (part.length <= maxLen) return [part];
  const chunks: string[] = [];
  let remaining = part;
  while (remaining.length > maxLen) {
    const sliceAt = remaining.lastIndexOf(" ", maxLen);
    const cut = sliceAt > 20 ? sliceAt : maxLen;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

export function typingDelayMs(
  bubble: string,
  mood: string,
  index: number
): number {
  const base = 150 + bubble.length * 6 + index * 80;
  const moodFactor =
    mood === "anxious" || mood === "excited"
      ? 0.75
      : mood === "annoyed" || mood === "hurt"
        ? 1.25
        : mood === "tired"
          ? 1.35
          : 1;
  const jitter = Math.floor(Math.random() * 150);
  const delay = Math.round(base * moodFactor + jitter);
  // Cap at 1000ms max delay so it never blocks the conversation for too long
  return Math.min(1000, delay);
}
