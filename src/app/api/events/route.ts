import { AuthError, requireUser } from "@/lib/auth/current-user";
import { sseHub, type SseEvent } from "@/lib/sse/hub";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const encoder = new TextEncoder();
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let unsubscribe: (() => void) | undefined;

    const stream = new ReadableStream({
      start(controller) {
        const send = (event: SseEvent) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        };

        unsubscribe = sseHub.subscribe(user.id, send);
        send({ type: "ping", userId: user.id });

        heartbeat = setInterval(() => {
          send({ type: "ping", userId: user.id });
        }, 25_000);
      },
      cancel() {
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe?.();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}
