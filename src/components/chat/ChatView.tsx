"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LogOut, Settings2 } from "lucide-react";
import { Composer } from "@/components/chat/Composer";
import { MessageList, type ChatMessage } from "@/components/chat/MessageList";
import {
  createOptimisticUserMessage,
  mergeMessages,
  upsertMessage,
} from "@/components/chat/message-utils";
import { moodColor } from "@/lib/persona/mood";
import type { Mood } from "@/lib/types/persona";

const USE_POLLING = process.env.NEXT_PUBLIC_USE_POLLING === "true";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export function ChatView() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [personaName, setPersonaName] = useState("Alex");
  const [mood, setMood] = useState<Mood>("calm");
  const [health, setHealth] = useState({
    ok: false,
    db: false,
    ai: false,
    provider: "gemini",
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef(0);
  const pendingIdRef = useRef(-1);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const syncMessages = useCallback(async (since?: number) => {
    const query = since ? `?since=${since}` : "";
    const res = await fetch(`/api/messages${query}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { messages: ChatMessage[] };
    if (since && data.messages.length === 0) return;
    if (!since) {
      setMessages(data.messages);
    } else {
      setMessages((prev) => mergeMessages(prev, data.messages));
    }
    const maxId = Math.max(
      ...data.messages.filter((m) => m.id > 0).map((m) => m.id),
      lastMessageIdRef.current
    );
    if (maxId > lastMessageIdRef.current) {
      lastMessageIdRef.current = maxId;
    }
  }, []);

  const loadPersona = useCallback(async () => {
    const res = await fetch("/api/persona", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      config: { name: string };
      runtime: { mood: Mood };
    };
    setPersonaName(data.config.name);
    setMood(data.runtime.mood);
  }, []);

  const deleteMessage = useCallback(async (id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    await fetch(`/api/messages/${id}`, { method: "DELETE", cache: "no-store" });
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    async function bootstrap() {
      const [historyRes, healthRes] = await Promise.all([
        fetch("/api/messages", { cache: "no-store" }),
        fetch("/api/health", { cache: "no-store" }),
      ]);

      if (historyRes.ok) {
        const data = (await historyRes.json()) as { messages: ChatMessage[] };
        setMessages(data.messages);
        lastMessageIdRef.current = data.messages.at(-1)?.id ?? 0;
      }

      await loadPersona();

      if (healthRes.ok) {
        setHealth(await healthRes.json());
      }
    }

    void bootstrap();
  }, [loadPersona]);

  useEffect(() => {
    async function registerPush() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const keyRes = await fetch("/api/push/subscribe");
        const { publicKey } = (await keyRes.json()) as { publicKey: string };
        if (!publicKey) return;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        // Unsubscribe from any existing subscription to prevent key/applicationServerKey conflicts
        const existingSubscription = await reg.pushManager.getSubscription();
        if (existingSubscription) {
          try {
            await existingSubscription.unsubscribe();
          } catch (unsubErr) {
            console.warn("Failed to unsubscribe existing push subscription", unsubErr);
          }
        }

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        });
        setNotificationsEnabled(true);
      } catch (error) {
        console.error("Push registration failed", error);
      }
    }

    void registerPush();
  }, []);

  useEffect(() => {
    const onFocus = () => {
      void syncMessages(lastMessageIdRef.current);
      void loadPersona();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [syncMessages, loadPersona]);

  useEffect(() => {
    if (!USE_POLLING) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void syncMessages(lastMessageIdRef.current);
        void loadPersona();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [syncMessages, loadPersona]);

  useEffect(() => {
    if (USE_POLLING) return;

    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      source = new EventSource("/api/events");

      source.onmessage = (event) => {
        const data = JSON.parse(event.data) as
          | { type: "typing_start" }
          | { type: "typing_stop" }
          | { type: "message_bubble"; payload: ChatMessage }
          | { type: "message_deleted"; payload: { id: number } }
          | { type: "mood_shift"; payload: { mood: Mood; intensity: number } }
          | { type: "ping" };

        if (data.type === "typing_start") setIsTyping(true);
        if (data.type === "typing_stop") setIsTyping(false);
        if (data.type === "mood_shift") setMood(data.payload.mood);
        if (data.type === "message_deleted") {
          setMessages((prev) => prev.filter((m) => m.id !== data.payload.id));
        }
        if (data.type === "message_bubble") {
          setMessages((prev) => upsertMessage(prev, data.payload));
          if (data.payload.id > lastMessageIdRef.current) {
            lastMessageIdRef.current = data.payload.id;
          }
        }
      };

      source.onerror = () => {
        source?.close();
        reconnectTimer = setTimeout(() => {
          void syncMessages(lastMessageIdRef.current);
          connect();
        }, 3000);
      };
    }

    connect();

    return () => {
      source?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [syncMessages]);

  function reportTyping(typing: boolean) {
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => {
      void fetch("/api/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typing }),
      });
    }, typing ? 0 : 300);
  }

  async function sendMessage(text: string) {
    const clientId = crypto.randomUUID();
    pendingIdRef.current -= 1;
    const optimistic = createOptimisticUserMessage(
      text,
      pendingIdRef.current,
      clientId
    );

    setMessages((prev) => upsertMessage(prev, optimistic));

    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  }

  return (
    <div className="flex h-[100dvh] w-full justify-center bg-zinc-100 dark:bg-zinc-900">
      <div className="flex h-full w-full min-w-0 flex-col bg-white dark:bg-zinc-950 sm:max-w-lg md:max-w-xl lg:max-w-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-3 py-3 sm:px-4 dark:border-zinc-800">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${moodColor(mood)}`}
            />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold">{personaName}</h1>
              <p className="truncate text-xs capitalize text-zinc-500">{mood}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={logout}
              className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <Link
              href="/settings"
              className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              aria-label="Settings"
            >
              <Settings2 className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {!health.ok ? (
          <div className="shrink-0 bg-amber-50 px-3 py-2 text-xs text-amber-800 sm:px-4 dark:bg-amber-950 dark:text-amber-200">
            {!health.ai
              ? "AI offline. Set GEMINI_API_KEY on Vercel or run Ollama locally."
              : !health.db
                ? "Database not connected."
                : "Companion offline."}
          </div>
        ) : null}

        {notificationsEnabled ? (
          <div className="shrink-0 bg-sky-50 px-3 py-1.5 text-center text-[11px] text-sky-700 sm:px-4 dark:bg-sky-950 dark:text-sky-200">
            Proactive texts enabled via cron ({health.provider})
          </div>
        ) : null}

        <MessageList
          messages={messages}
          isTyping={isTyping}
          onDelete={deleteMessage}
        />
        <div ref={bottomRef} />
        <Composer
          onSend={sendMessage}
          onTyping={reportTyping}
          disabled={!health.ok}
        />
      </div>
    </div>
  );
}
