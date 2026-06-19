"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LogOut, Settings2, Info } from "lucide-react";
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
    const clientId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15);
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
    <div className="flex h-[100dvh] w-full justify-center bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      <div className="flex h-full w-full min-w-0 flex-col bg-white dark:bg-zinc-900 border-x border-zinc-200/50 dark:border-zinc-800/50 sm:max-w-lg md:max-w-xl lg:max-w-2xl shadow-2xl shadow-sky-500/5">
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-150/80 dark:border-zinc-800/80 px-4 py-3 backdrop-blur-md bg-white/70 dark:bg-zinc-900/70 sticky top-0 z-10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 select-none">
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-500 text-sm font-bold text-white shadow-md shadow-sky-500/20">
                {personaName.slice(0, 2).toUpperCase()}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-zinc-900 ${moodColor(mood)} shadow-sm`} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-zinc-850 dark:text-zinc-100">{personaName}</h1>
              <p className="truncate text-[10px] font-bold uppercase tracking-wider text-sky-500 dark:text-sky-400">{mood}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={logout}
              className="rounded-xl p-2 text-zinc-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all duration-200"
              aria-label="Sign out"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
            <Link
              href="/settings"
              className="rounded-xl p-2 text-zinc-500 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/20 transition-all duration-200"
              aria-label="Settings"
            >
              <Settings2 className="h-4.5 w-4.5" />
            </Link>
          </div>
        </header>

        {!health.ok ? (
          <div className="shrink-0 bg-rose-50/80 border-b border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 px-4 py-2 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2 backdrop-blur-sm animate-fadeIn">
            <Info className="h-4 w-4 text-rose-500 shrink-0" />
            <span>
              {!health.ai
                ? "AI offline. Setup GEMINI_API_KEY in Vercel or locally."
                : !health.db
                  ? "Database connection failed."
                  : "Companion server offline."}
            </span>
          </div>
        ) : null}

        {notificationsEnabled ? (
          <div className="shrink-0 bg-sky-50/80 border-b border-sky-100 dark:bg-sky-950/20 dark:border-sky-900/30 px-4 py-1.5 text-center text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider backdrop-blur-sm">
            Proactive messaging enabled via Vercel Crons ({health.provider})
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
