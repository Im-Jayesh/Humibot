import { AuthError, requireUser } from "@/lib/auth/current-user";
import { deleteMessage } from "@/lib/memory/context";
import { sseHub } from "@/lib/sse/hub";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const messageId = Number(id);
    if (!messageId) {
      return Response.json({ error: "Invalid id" }, { status: 400 });
    }

    const ok = await deleteMessage(user.id, messageId);
    if (!ok) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    sseHub.publish({
      type: "message_deleted",
      userId: user.id,
      payload: { id: messageId },
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}
