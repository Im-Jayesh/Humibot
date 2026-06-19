import { sql } from "drizzle-orm";
import { checkAiHealth } from "@/lib/ai/embed";
import { useGemini } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbOk = false;
  let userProfileTableOk = false;
  let embeddingsTableOk = false;
  let dbError: string | null = null;

  try {
    if (process.env.DATABASE_URL) {
      const { getDb } = await import("@/lib/db");
      const db = getDb();
      await db.execute(sql`select 1`);
      dbOk = true;

      // Verify user_profile table
      try {
        await db.execute(sql`select count(*) from "user_profile"`);
        userProfileTableOk = true;
      } catch (err: any) {
        userProfileTableOk = false;
        dbError = `user_profile table check failed: ${err.message}`;
      }

      // Verify message_embeddings table
      try {
        await db.execute(sql`select count(*) from "message_embeddings"`);
        embeddingsTableOk = true;
      } catch (err: any) {
        embeddingsTableOk = false;
        if (!dbError) dbError = `message_embeddings table check failed: ${err.message}`;
      }
    } else {
      dbError = "DATABASE_URL environment variable is missing";
    }
  } catch (err: any) {
    dbOk = false;
    dbError = `Database connection failed: ${err.message}`;
  }

  const aiOk = await checkAiHealth();

  return Response.json({
    ok: dbOk && aiOk && userProfileTableOk && embeddingsTableOk,
    db: dbOk,
    userProfileTable: userProfileTableOk,
    embeddingsTable: embeddingsTableOk,
    ai: aiOk,
    dbError,
    provider: useGemini() ? "gemini" : "ollama",
  });
}
