"use client";

import { format } from "date-fns";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { sortMessages } from "@/components/chat/message-utils";
import type { ChatMessage } from "@/components/chat/types";

export type { ChatMessage } from "@/components/chat/types";

export function MessageList({
  messages,
  isTyping,
  onDelete,
}: {
  messages: ChatMessage[];
  isTyping: boolean;
  onDelete?: (id: number) => void;
}) {
  const sorted = sortMessages(messages);
  const groups: ChatMessage[][] = [];

  for (const message of sorted) {
    const last = groups[groups.length - 1];
    if (last && last[0]?.groupId === message.groupId) {
      last.push(message);
    } else {
      groups.push([message]);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-3 py-3 sm:gap-3 sm:px-4 sm:py-4">
      {groups.map((group) => {
        const stamp = group[0]?.createdAt;
        return (
          <div
            key={`${group[0]?.groupId}-${group[0]?.id}`}
            className="space-y-1 sm:space-y-1.5"
          >
            {stamp ? (
              <p className="text-center text-[10px] text-zinc-400 sm:text-[11px]">
                {format(new Date(stamp), "h:mm a")}
              </p>
            ) : null}
            {group.map((message, index) => (
              <MessageBubble
                key={message.clientId ?? message.id}
                message={message}
                showTail={index === group.length - 1}
                onDelete={onDelete}
              />
            ))}
          </div>
        );
      })}
      {isTyping ? <TypingIndicator /> : null}
    </div>
  );
}
