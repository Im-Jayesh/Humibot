import { z } from "zod";
import { AuthError, requireUser } from "@/lib/auth/current-user";
import { getUserProfile, updateUserProfile } from "@/lib/persona/profile-extractor";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await getUserProfile(user.id);
    return Response.json(
      { profile },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}

const patchSchema = z.object({
  name: z.string().max(80).optional(),
  location: z.string().max(80).optional(),
  profession: z.string().max(80).optional(),
  facts: z.array(z.string()).optional(),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = patchSchema.parse(await request.json());

    const profile = await updateUserProfile(user.id, body);

    return Response.json(
      { profile },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid profile data", details: error.flatten() },
        { status: 400 }
      );
    }
    console.error("Profile save failed:", error);
    return Response.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
