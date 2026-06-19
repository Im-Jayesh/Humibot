import { z } from "zod";
import { AuthError, requireUser } from "@/lib/auth/current-user";
import {
  ensurePersonaSeeded,
  getPersonaConfig,
  getPersonaRuntime,
  getStyleSamples,
  replaceStyleSamples,
  updatePersonaConfig,
  updateSchedule,
} from "@/lib/persona/engine";
import {
  personaConfigSchema,
  scheduleBlockSchema,
  styleSampleSchema,
} from "@/lib/types/persona";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    await ensurePersonaSeeded(user.id);
    const [config, runtime, styleSamples] = await Promise.all([
      getPersonaConfig(user.id),
      getPersonaRuntime(user.id),
      getStyleSamples(user.id),
    ]);
    return Response.json(
      { config, runtime, styleSamples },
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
  config: personaConfigSchema.optional(),
  schedule: z.array(scheduleBlockSchema).optional(),
  styleSamples: z.array(styleSampleSchema).optional(),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = patchSchema.parse(await request.json());

    if (body.config) {
      await updatePersonaConfig(user.id, body.config);
    }
    if (body.schedule) {
      await updateSchedule(user.id, body.schedule);
    }
    if (body.styleSamples) {
      await replaceStyleSamples(user.id, body.styleSamples);
    }

    const [config, runtime, styleSamples] = await Promise.all([
      getPersonaConfig(user.id),
      getPersonaRuntime(user.id),
      getStyleSamples(user.id),
    ]);

    return Response.json(
      { config, runtime, styleSamples },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid persona data", details: error.flatten() },
        { status: 400 }
      );
    }
    console.error("Persona save failed:", error);
    return Response.json({ error: "Failed to save persona" }, { status: 500 });
  }
}
