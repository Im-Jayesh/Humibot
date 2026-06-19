import { AuthError, requireUser } from "@/lib/auth/current-user";
import { getMessagesSince } from "@/lib/memory/context";
import { handleUserMessage, queueUserMessage } from "@/lib/chat/pipeline";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since");
    const sinceId = since ? Number(since) : undefined;
    const rows = await getMessagesSince(user.id, sinceId);

    return Response.json({
      messages: rows.map((row) => ({
        id: row.id,
        role: row.role,
        content: row.content,
        bubbleIndex: row.bubbleIndex,
        groupId: row.groupId,
        isProactive: row.isProactive,
        createdAt: row.createdAt?.toISOString(),
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as { text?: string };
    const text = body.text?.trim();
    if (!text) {
      return Response.json({ error: "text is required" }, { status: 400 });
    }

    const queued = await queueUserMessage(user.id, text);
    if (queued) {
      return Response.json({ ok: true, queued: true });
    }

    void handleUserMessage(user.id, text);
    return Response.json({ ok: true, queued: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}
