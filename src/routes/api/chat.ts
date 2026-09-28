import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import {
  getLovableAiGatewayResponseHeaders,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";
import { resolveAiProvider } from "@/lib/ai-provider.server";

type ChatRequestBody = { messages?: unknown; context?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, context } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const initialRunId = getLovableAiGatewayRunId(request);
        let ai: ReturnType<typeof resolveAiProvider>;
        try {
          ai = resolveAiProvider(initialRunId);
        } catch (error) {
          return new Response(error instanceof Error ? error.message : "AI is not configured", {
            status: 500,
          });
        }
        const runIdFetch = ai.runIdFetch;

        const studyContext =
          typeof context === "string" && context.trim().length > 0
            ? `\n\nThe learner is currently studying these notes. Ground your answers in them when relevant:\n\n${context.slice(0, 12000)}`
            : "";

        const result = streamText({
          model: ai.model,
          system:
            "You are a patient study tutor. Explain in plain, simple language with short paragraphs, concrete examples and analogies. Use markdown: bold key terms, short bullet lists, and a one-line 'In short:' summary at the end. Never invent facts; say when you are unsure." +
            studyContext,
          messages: await convertToModelMessages(messages as UIMessage[]),
          abortSignal: request.signal,
          ...(ai.providerOptions ? { providerOptions: ai.providerOptions } : {}),
        });


        return withLovableAiGatewayRunIdHeader(
          result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
            sendReasoning: true,
            headers: getLovableAiGatewayResponseHeaders(undefined, {
              ...(initialRunId ? { "X-Lovable-AIG-Run-ID": initialRunId } : {}),
            }),
          }),
          runIdFetch,
        );
      },
    },
  },
});
