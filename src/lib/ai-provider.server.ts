import { createOpenAI } from "@ai-sdk/openai";

import { createLovableAiGatewayRunIdFetch } from "./ai-gateway.server";

const LOVABLE_MODEL = "openai/gpt-6-astra";
const LOVABLE_BASE_URL = "https://ai.gateway.lovable.dev/v1";

/**
 * Resolves the AI provider for the current environment.
 *
 * - On Lovable, LOVABLE_API_KEY is injected automatically and requests go
 *   through the Lovable AI Gateway.
 * - On an external host (Vercel, Netlify, self-hosted), set OPENAI_API_KEY
 *   (and optionally OPENAI_MODEL / OPENAI_BASE_URL) and requests go straight
 *   to OpenAI.
 */
export function resolveAiProvider(initialRunId?: string) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const openaiKey = process.env["OPENAI_API_KEY"];

  if (lovableKey) {
    const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId);
    const provider = createOpenAI({
      baseURL: LOVABLE_BASE_URL,
      apiKey: lovableKey,
      headers: { "Lovable-API-Key": lovableKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });
    return {
      model: provider.responses(LOVABLE_MODEL),
      runIdFetch,
      isLovable: true as const,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    };
  }

  if (openaiKey) {
    const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId);
    const provider = createOpenAI({
      apiKey: openaiKey,
      ...(process.env["OPENAI_BASE_URL"] ? { baseURL: process.env["OPENAI_BASE_URL"] } : {}),
    });
    return {
      model: provider(process.env["OPENAI_MODEL"] ?? "gpt-4o-mini"),
      runIdFetch,
      isLovable: false as const,
      providerOptions: undefined,
    };
  }

  throw new Error(
    "No AI key configured. Set LOVABLE_API_KEY (on Lovable) or OPENAI_API_KEY (on an external host).",
  );
}
