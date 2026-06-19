import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { ollama } from "ai-sdk-ollama";

export function useGemini() {
  return Boolean(
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.AI_PROVIDER === "gemini"
  );
}

export function getChatModel() {
  if (useGemini()) {
    const apiKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
    const googleInstance = createGoogleGenerativeAI({
      apiKey,
    });
    return googleInstance(process.env.GEMINI_MODEL ?? "gemini-2.5-flash");
  }
  return ollama(process.env.OLLAMA_CHAT_MODEL ?? "gemma4:e2b");
}
