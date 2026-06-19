import { sql } from "drizzle-orm";
import { checkAiHealth } from "@/lib/ai/embed";
import { useGemini } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbOk = false;
  try {
    if (process.env.DATABASE_URL) {
      const { getDb } = await import("@/lib/db");
      const db = getDb();
      await db.execute(sql`select 1`);
      dbOk = true;
    }
  } catch {
    dbOk = false;
  }

  const aiOk = await checkAiHealth();

  return Response.json({
    ok: dbOk && aiOk,
    db: dbOk,
    ai: aiOk,
    provider: useGemini() ? "gemini" : "ollama",
  });
}
