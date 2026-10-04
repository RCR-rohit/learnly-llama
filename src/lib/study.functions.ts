import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { friendlyGeminiError, isTemporaryError, parseModelJson, withGemini } from "./gemini.server";

async function generateText(system: string, prompt: string, json = false) {
  const res = await withGemini((ai, model) =>
    ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: system,
        ...(json ? { responseMimeType: "application/json" } : {}),
      },
    }),
  );
  const text = res.text ?? "";
  if (!text.trim()) throw new Error("Empty AI response");
  return text;
}

async function generateJson<T>(schema: z.ZodType<T>, system: string, prompt: string): Promise<T> {
  let lastError: unknown;
  // One extra attempt only for malformed JSON; availability retries live in withGemini.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const text = await generateText(system, prompt, true);
      return schema.parse(parseModelJson(text));
    } catch (error) {
      lastError = error;
      if (isTemporaryError(error) || (error instanceof Error && /GEMINI_API_KEY|401|403/.test(error.message))) break;
    }
  }
  throw lastError;
}

const TopicInput = z.object({
  topic: z.string().min(1),
  detail: z.string().nullable(),
});

export const generateNotes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TopicInput.parse(input))
  .handler(async ({ data }) => {
    try {
      const notes = await generateText(
        "You write simple, beginner-friendly study notes. Use plain language, short sentences and everyday examples. Structure with markdown headings, bullet points, bold key terms, and finish with a '## Quick recap' list of the 5 most important takeaways. Keep it under roughly 700 words.",
        `Write study notes on: ${data.topic}${
          data.detail ? `\n\nExtra context or source material from the learner:\n${data.detail.slice(0, 12000)}` : ""
        }`,
      );
      return { notes };
    } catch (error) {
      console.error(error);
      throw friendlyGeminiError(error);
    }
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
      const output = await generateJson(
        McqSchema,
        'You write fair multiple-choice questions for learners. Exactly 4 options per question, only one clearly correct. correctIndex is the 0-based index of the right option. Keep the explanation to one or two simple sentences. Reply ONLY with JSON: {"questions":[{"question":string,"options":[string,string,string,string],"correctIndex":number,"explanation":string}]}',
        `Write exactly ${count} multiple-choice questions on: ${data.topic}${
          data.notes ? `\n\nBase them on these notes:\n${data.notes.slice(0, 12000)}` : ""
        }`,
      );
      return {
        questions: output.questions
          .filter((q) => q.options.length >= 2)
          .map((q) => ({
            ...q,
            correctIndex: Math.min(Math.max(Math.round(q.correctIndex), 0), q.options.length - 1),
          }))
          .slice(0, count),
      };
    } catch (error) {
      console.error(error);
      throw friendlyGeminiError(error);
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
      const output = await generateJson(
        FlashcardSchema,
        'You make revision flashcards. The front is a short prompt, term or question (max ~12 words). The back is a simple, memorable answer (max ~35 words). No numbering. Reply ONLY with JSON: {"cards":[{"front":string,"back":string}]}',
        `Make exactly ${count} flashcards on: ${data.topic}${
          data.notes ? `\n\nBase them on these notes:\n${data.notes.slice(0, 12000)}` : ""
        }`,
      );
      return { cards: output.cards.slice(0, count) };
    } catch (error) {
      console.error(error);
      throw friendlyGeminiError(error);
    }
  });
