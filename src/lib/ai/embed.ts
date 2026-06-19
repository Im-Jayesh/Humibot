import { useGemini } from "@/lib/ai/provider";

export async function embedText(text: string): Promise<number[]> {
  if (useGemini()) {
    const key =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Gemini API key missing");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text }] },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini embedding failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      embedding?: { values?: number[] };
    };
    const values = data.embedding?.values;
    if (!values?.length) throw new Error("Empty embedding");
    return values;
  }

  const host = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";
  const response = await fetch(`${host}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: text }),
  });

  if (!response.ok) {
    throw new Error(`Ollama embedding failed: ${response.status}`);
  }

  const data = (await response.json()) as { embedding: number[] };
  return data.embedding;
}

export async function checkAiHealth() {
  if (useGemini()) {
    const key =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
    return Boolean(key);
  }

  try {
    const host = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
    const response = await fetch(`${host}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}
