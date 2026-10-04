import { createFileRoute } from "@tanstack/react-router";
import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";

import { friendlyGeminiError, withGemini } from "@/lib/gemini.server";

type ChatRequestBody = { messages?: unknown; context?: unknown };

function toGeminiContents(messages: UIMessage[]) {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [
        {
          text: m.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("")
            .trim() || " ",
        },
      ],
    }));
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, context } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        if (!process.env["GEMINI_API_KEY"]) {
          return new Response(friendlyGeminiError(new Error("Missing GEMINI_API_KEY")).message, {
            status: 500,
          });
        }

        const studyContext =
          typeof context === "string" && context.trim().length > 0
            ? `\n\nThe learner is currently studying these notes. Ground your answers in them when relevant:\n\n${context.slice(0, 12000)}`
            : "";

        const stream = createUIMessageStream({
          originalMessages: messages as UIMessage[],
          execute: async ({ writer }) => {
            const id = crypto.randomUUID();
            // Retry/fallback covers opening the stream and its first chunk,
            // before anything is sent to the browser.
            const { iterator, first } = await withGemini(async (ai, model) => {
              const response = await ai.models.generateContentStream({
                model,
                contents: toGeminiContents(messages as UIMessage[]),
                config: {
                  abortSignal: request.signal,
                  systemInstruction:
                    "You are a patient study tutor. Explain in plain, simple language with short paragraphs, concrete examples and analogies. Use markdown: bold key terms, short bullet lists, and a one-line 'In short:' summary at the end. Never invent facts; say when you are unsure." +
                    studyContext,
                },
              });
              const it = response[Symbol.asyncIterator]();
              return { iterator: it, first: await it.next() };
            }, request.signal);
            writer.write({ type: "text-start", id });
            let next = first;
            while (!next.done) {
              const delta = next.value.text;
              if (delta) writer.write({ type: "text-delta", id, delta });
              next = await iterator.next();
            }
            writer.write({ type: "text-end", id });
          },
          onError: (error) => {
            console.error(error);
            return friendlyGeminiError(error).message;
          },
        });

        return createUIMessageStreamResponse({ stream });
      },
    },
  },
});
