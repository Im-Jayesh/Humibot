"use client";

import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import type { ChatMessage } from "@/components/chat/types";

export function MessageBubble({
  message,
  showTail,
  onDelete,
}: {
  message: ChatMessage;
  showTail: boolean;
  onDelete?: (id: number) => void;
}) {
  const isUser = message.role === "user";
  const canDelete = onDelete && message.id > 0;

  return (
    <div className={cn("group flex items-end gap-1", isUser ? "justify-end" : "justify-start")}>
      {canDelete && !isUser ? (
        <button
          type="button"
          onClick={() => onDelete(message.id)}
          className="mb-1 rounded-full p-1.5 text-zinc-400 opacity-0 transition hover:bg-zinc-200 hover:text-rose-500 group-hover:opacity-100 dark:hover:bg-zinc-800"
          aria-label="Delete message"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}
      <div
        className={cn(
          "max-w-[min(85vw,20rem)] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm sm:max-w-[75%] sm:px-3.5 sm:text-[15px]",
          isUser
            ? "rounded-br-md bg-sky-500 text-white"
            : "rounded-bl-md bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50",
          !showTail && (isUser ? "rounded-br-2xl" : "rounded-bl-2xl")
        )}
      >
        {message.content}
      </div>
      {canDelete && isUser ? (
        <button
          type="button"
          onClick={() => onDelete(message.id)}
          className="mb-1 rounded-full p-1.5 text-zinc-400 opacity-0 transition hover:bg-zinc-200 hover:text-rose-500 group-hover:opacity-100 dark:hover:bg-zinc-800"
          aria-label="Delete message"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
