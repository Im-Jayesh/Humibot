import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db";
import { initiativeLog } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const db = getDb();
    
    const logs = await db
      .select()
      .from(initiativeLog)
      .where(eq(initiativeLog.userId, user.id))
      .orderBy(desc(initiativeLog.createdAt))
      .limit(15);
      
    return NextResponse.json({
      ok: true,
      logs: logs.map((log) => ({
        id: log.id,
        impulseScore: log.impulseScore,
        sent: log.sent,
        reason: log.reason,
        createdAt: log.createdAt?.toISOString(),
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Fetch initiative logs failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
