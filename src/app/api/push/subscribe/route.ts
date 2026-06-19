import { AuthError, requireUser } from "@/lib/auth/current-user";
import { getVapidPublicKey, savePushSubscription } from "@/lib/push/web-push";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ publicKey: getVapidPublicKey() });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      subscription?: {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
    };

    if (!body.subscription) {
      return Response.json({ error: "subscription required" }, { status: 400 });
    }

    await savePushSubscription(user.id, body.subscription);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}
