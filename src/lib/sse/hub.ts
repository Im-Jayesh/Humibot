import { EventEmitter } from "events";

export type SseEvent =
  | { type: "typing_start"; userId: string }
  | { type: "typing_stop"; userId: string }
  | {
      type: "message_bubble";
      userId: string;
      payload: ChatBubblePayload;
    }
  | {
      type: "mood_shift";
      userId: string;
      payload: { mood: string; intensity: number };
    }
  | {
      type: "message_deleted";
      userId: string;
      payload: { id: number };
    }
  | { type: "ping"; userId?: string };

export type ChatBubblePayload = {
  id: number;
  role: "user" | "assistant";
  content: string;
  bubbleIndex: number;
  groupId: string;
  isProactive?: boolean;
  createdAt: string;
};

class SseHub extends EventEmitter {
  subscribe(userId: string, listener: (event: SseEvent) => void) {
    const handler = (event: SseEvent) => {
      if ("userId" in event && event.userId !== userId) return;
      listener(event);
    };
    this.on("event", handler);
    return () => this.off("event", handler);
  }

  publish(event: SseEvent) {
    this.emit("event", event);
  }
}

export const sseHub = new SseHub();
