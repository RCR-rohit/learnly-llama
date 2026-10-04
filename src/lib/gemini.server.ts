import { GoogleGenAI } from "@google/genai";

/** Primary model plus lower-demand fallbacks (all confirmed listed for this API key). */
export const PRIMARY_MODEL = "gemini-3.8-flash";
export const FALLBACK_MODELS = ["gemini-3.7-flash", "gemini-3.5-flash"];

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3; // after the first attempt: ~1s, ~2s, ~4s

export const BUSY_MESSAGE = "AI service is temporarily busy. Please try again in a few moments.";

function getClient() {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  return new GoogleGenAI({ apiKey });
}

function modelChain() {
  const primary = process.env["GEMINI_MODEL"] || PRIMARY_MODEL;
  return [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)];
}

function errorStatus(error: unknown): number | undefined {
  const e = error as { status?: unknown; code?: unknown; message?: unknown };
  if (typeof e?.status === "number") return e.status;
  if (typeof e?.code === "number") return e.code;
  const m = typeof e?.message === "string" ? e.message : "";
  const match = m.match(/"code"\s*:\s*(\d{3})/) ?? m.match(/\b(429|50[0234])\b/);
  return match?.[1] ? Number(match[1]) : undefined;
}

export function isTemporaryError(error: unknown) {
  const s = errorStatus(error);
  if (s !== undefined) return RETRYABLE_STATUS.has(s);
  const m = error instanceof Error ? error.message : String(error);
  return /UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded/i.test(m);
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new Error("aborted"));
    });
  });

/**
 * Runs a Gemini call with exponential backoff on temporary errors, then
 * falls back to the next model. Everything happens server-side, so the
 * browser sends a single request.
 */
export async function withGemini<T>(
  call: (ai: GoogleGenAI, model: string) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  const ai = getClient();
  let lastError: unknown;
  for (const model of modelChain()) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = 1000 * 2 ** (attempt - 1) + Math.random() * 300;
        await sleep(delay, signal);
      }
      try {
        return await call(ai, model);
      } catch (error) {
        lastError = error;
        if (!isTemporaryError(error)) throw error;
        console.warn(`[gemini] ${model} attempt ${attempt + 1} failed (status ${errorStatus(error) ?? "?"})`);
      }
    }
    console.warn(`[gemini] ${model} exhausted retries, trying next model`);
  }
  throw lastError;
}

/** Parse JSON from a model reply, tolerating ```json fences or stray prose. */
export function parseModelJson(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) t = fence[1].trim();
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
  if (isTemporaryError(error)) return new Error(BUSY_MESSAGE);
  if (/API key|401|403|PERMISSION_DENIED/i.test(msg)) return new Error("The Gemini API key was rejected.");
  return new Error("The AI couldn't respond right now. Please try again.");
}
