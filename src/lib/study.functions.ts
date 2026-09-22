import { createOpenAI } from "@ai-sdk/openai";
import { createServerFn } from "@tanstack/react-start";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

import { createLovableAiGatewayRunIdFetch } from "./ai-gateway.server";

const MODEL = "openai/gpt-6-astra";

function getModel() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const lovable = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  return lovable.responses(MODEL);
}

const reasoningOptions = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    store: false,
    include: ["reasoning.encrypted_content"],
  },
} as const;

const TopicInput = z.object({
  topic: z.string().min(1),
  detail: z.string().nullable(),
});

export const generateNotes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TopicInput.parse(input))
  .handler(async ({ data }) => {
    const result = streamText({
      model: getModel(),
      providerOptions: reasoningOptions,
      system:
        "You write simple, beginner-friendly study notes. Use plain language, short sentences and everyday examples. Structure with markdown headings, bullet points, bold key terms, and finish with a '## Quick recap' list of the 5 most important takeaways. Keep it under roughly 700 words.",
      prompt: `Write study notes on: ${data.topic}${
        data.detail ? `\n\nExtra context or source material from the learner:\n${data.detail.slice(0, 12000)}` : ""
      }`,
    });

    return { notes: await result.text };
  });

const McqSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number(),
      explanation: z.string(),
    }),
  ),
});

export const generateMcqs = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ topic: z.string().min(1), notes: z.string().nullable(), count: z.number() }).parse(input),
  )
  .handler(async ({ data }) => {
    const count = Math.min(Math.max(Math.round(data.count) || 5, 3), 15);
    try {
      const result = streamText({
        model: getModel(),
        providerOptions: reasoningOptions,
        output: Output.object({ schema: McqSchema }),
        system:
          "You write fair multiple-choice questions for learners. Exactly 4 options per question, only one clearly correct. correctIndex is the 0-based index of the right option. Keep the explanation to one or two simple sentences.",
        prompt: `Write exactly ${count} multiple-choice questions on: ${data.topic}${
          data.notes ? `\n\nBase them on these notes:\n${data.notes.slice(0, 12000)}` : ""
        }`,
      });
      const output = await result.output;
      return {
        questions: output.questions
          .filter((q) => q.options.length >= 2)
          .map((q) => ({
            ...q,
            correctIndex: Math.min(Math.max(q.correctIndex, 0), q.options.length - 1),
          }))
          .slice(0, count),
      };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        throw new Error("The quiz came back in an unexpected format. Please try again.");
      }
      throw error;
    }
  });

const FlashcardSchema = z.object({
  cards: z.array(z.object({ front: z.string(), back: z.string() })),
});

export const generateFlashcards = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ topic: z.string().min(1), notes: z.string().nullable(), count: z.number() }).parse(input),
  )
  .handler(async ({ data }) => {
    const count = Math.min(Math.max(Math.round(data.count) || 10, 4), 25);
    try {
      const result = streamText({
        model: getModel(),
        providerOptions: reasoningOptions,
        output: Output.object({ schema: FlashcardSchema }),
        system:
          "You make revision flashcards. The front is a short prompt, term or question (max ~12 words). The back is a simple, memorable answer (max ~35 words). No numbering.",
        prompt: `Make exactly ${count} flashcards on: ${data.topic}${
          data.notes ? `\n\nBase them on these notes:\n${data.notes.slice(0, 12000)}` : ""
        }`,
      });
      const output = await result.output;
      return { cards: output.cards.slice(0, count) };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        throw new Error("The flashcards came back in an unexpected format. Please try again.");
      }
      throw error;
    }
  });
