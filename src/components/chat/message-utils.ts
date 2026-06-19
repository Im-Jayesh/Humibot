import type { ChatMessage } from "@/components/chat/types";

export function sortMessages(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => {
    const timeDiff =
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    const aPending = a.clientId ? 1 : 0;
    const bPending = b.clientId ? 1 : 0;
    if (aPending !== bPending) return aPending - bPending;
    return a.id - b.id;
  });
}

function isSameUserBubble(a: ChatMessage, b: ChatMessage) {
  return (
    a.role === "user" &&
    b.role === "user" &&
    a.content.trim() === b.content.trim() &&
    Math.abs(
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ) < 60_000
  );
}

export function upsertMessage(
  prev: ChatMessage[],
  incoming: ChatMessage
): ChatMessage[] {
  const withoutDuplicate = prev.filter((message) => {
    if (message.id === incoming.id) return false;
    if (message.clientId && !incoming.clientId && isSameUserBubble(message, incoming)) {
      return false;
    }
    return true;
  });

  if (withoutDuplicate.some((m) => m.id === incoming.id)) {
    return sortMessages(withoutDuplicate);
  }

  return sortMessages([...withoutDuplicate, incoming]);
}

export function mergeMessages(
  prev: ChatMessage[],
  incoming: ChatMessage[]
): ChatMessage[] {
  let next = prev;
  for (const message of incoming) {
    next = upsertMessage(next, message);
  }
  return next;
}

export function createOptimisticUserMessage(
  text: string,
  pendingId: number,
  clientId: string
): ChatMessage {
  return {
    id: pendingId,
    clientId,
    role: "user",
    content: text,
    bubbleIndex: 0,
    groupId: clientId,
    createdAt: new Date().toISOString(),
  };
}
