import { google } from "@ai-sdk/google";
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
    return google(process.env.GEMINI_MODEL ?? "gemini-2.5-flash");
  }
  return ollama(process.env.OLLAMA_CHAT_MODEL ?? "gemma4:e2b");
}
