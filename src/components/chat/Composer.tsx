"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export function Composer({
  onSend,
  onTyping,
  disabled,
}: {
  onSend: (text: string) => void;
  onTyping?: (typing: boolean) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");

  function submit() {
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText("");
    onTyping?.(false);
  }

  return (
    <div className="shrink-0 border-t border-zinc-200 bg-white px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3 sm:py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-end gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
        <textarea
          rows={1}
          value={text}
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value);
            onTyping?.(e.target.value.length > 0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          onBlur={() => onTyping?.(false)}
          placeholder="Message"
          className="max-h-28 flex-1 resize-none bg-transparent text-[15px] outline-none placeholder:text-zinc-400"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !text.trim()}
          className="rounded-full bg-sky-500 p-2 text-white disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
