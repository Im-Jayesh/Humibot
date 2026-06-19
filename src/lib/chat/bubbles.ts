export function splitIntoBubbles(text: string, maxLen = 160): string[] {
  const cleaned = text.trim();
  if (!cleaned) return [];

  if (cleaned.length <= maxLen) {
    return [cleaned];
  }

  const parts = splitLongPart(cleaned, maxLen);
  return parts.map((s) => s.trim()).filter(Boolean);
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
  const base = 80 + bubble.length * 2 + index * 25;
  const moodFactor =
    mood === "anxious" || mood === "excited"
      ? 0.7
      : mood === "annoyed" || mood === "hurt"
        ? 1.2
        : mood === "tired"
          ? 1.3
          : 1;
  const jitter = Math.floor(Math.random() * 80);
  const delay = Math.round(base * moodFactor + jitter);
  // Cap at 350ms max delay per bubble so the conversation streams in fast
  return Math.min(350, delay);
}
