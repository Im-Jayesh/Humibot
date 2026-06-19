import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import {
  COOKIE_NAME,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ensurePersonaSeeded } from "@/lib/persona/engine";

const schema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const db = getDb();

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email.toLowerCase()))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(body.password);
    const [user] = await db
      .insert(users)
      .values({
        email: body.email.toLowerCase(),
        passwordHash,
      })
      .returning();

    await ensurePersonaSeeded(user.id);

    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
    });

    const opts = sessionCookieOptions();
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: opts.httpOnly,
      secure: opts.secure,
      sameSite: opts.sameSite,
      path: opts.path,
      maxAge: opts.maxAge,
    });

    return NextResponse.json({ ok: true, email: user.email });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("Register failed", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
