import { AuthError, requireUser } from "@/lib/auth/current-user";
import { setUserTyping } from "@/lib/chat/typing-state";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as { typing?: boolean };
    setUserTyping(user.id, Boolean(body.typing));
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}
