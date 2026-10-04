import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL_DEFAULT = "gemini-3.8-flash";

/** Server-only Gemini client. Reads GEMINI_API_KEY at call time. */
export function getGemini() {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  return {
    ai: new GoogleGenAI({ apiKey }),
    model: process.env["GEMINI_MODEL"] || GEMINI_MODEL_DEFAULT,
  };
}

/** Parse JSON from a model reply, tolerating ```json fences or stray prose. */
export function parseModelJson(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1));
    throw new Error("Invalid JSON from model");
  }
}

export function friendlyGeminiError(error: unknown): Error {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("Missing GEMINI_API_KEY")) return new Error("AI is not configured (missing Gemini key).");
  if (/429|RESOURCE_EXHAUSTED/i.test(msg)) return new Error("Too many AI requests right now. Please wait a moment.");
  if (/API key|401|403|PERMISSION_DENIED/i.test(msg)) return new Error("The Gemini API key was rejected.");
  return new Error("The AI couldn't respond right now. Please try again.");
}
