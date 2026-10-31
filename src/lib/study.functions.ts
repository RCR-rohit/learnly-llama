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
        "You are a master academic tutor and exam coach. Write a comprehensive, active-learning study guide — never dry definitions or plain bullet lists. Use plain, beginner-friendly language and markdown headings, bullets and bold key terms. Structure the guide exactly as follows: " +
          "1. '## Core definitions & intuition' — the definition in exact academic terminology, then a plain-English breakdown as if explaining to a 12-year-old, then a real-world analogy or everyday example. " +
          "2. '## Key concepts & breakdown' — core principles, rules, formulas or components; clearly mark what matters most for exams versus practical understanding. " +
          "3. '## Conceptual Q&A (short-form)' — 5 'Why?' or 'How?' questions that test deep understanding rather than memorisation, each followed by a clear answer of 2-4 sentences. " +
          "4. '## Common confusions & pitfalls' — include at least one 'What is the difference between X and Y?' comparison and 'What is the most common mistake students make with this concept?', each with an answer that corrects the misconception. " +
          "5. '## Exam-style questions & model answers (long-form)' — 2 scenario-based or analytical questions, each with a step-by-step model answer that demonstrates full-credit exam structure. " +
          "6. '## Quick viva / flash quiz' — 5 rapid-fire questions with one-sentence answers for fast recall before exams. " +
          "Keep the whole guide roughly 900-1400 words.",
        `Write the study guide on: ${data.topic}${
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

const KitSchema = z.object({
  title: z.string(),
  summary: z.string(),
  notes: z.string(),
  keyContent: z.string(),
  questions: McqSchema.shape.questions,
  cards: FlashcardSchema.shape.cards,
  viva: z.array(z.object({ question: z.string(), answer: z.string() })),
});

export const generatePdfStudyKit = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ fileName: z.string().max(300), base64: z.string().min(10).max(16_000_000) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const system =
      'You are a study assistant. Read the attached PDF (textbook, lecture or study material) and build a complete study kit grounded ONLY in it. Use simple, beginner-friendly language. Reply ONLY with JSON: {"title":string (short topic title),"summary":string (markdown, 5-8 sentence overview),"notes":string (markdown study notes with headings, bullets, bold key terms, ending with "## Quick recap"; under ~900 words),"keyContent":string (plain-text condensed key facts, definitions and formulas from the PDF, under ~2500 words, used later to answer questions),"questions":[{"question":string,"options":[4 strings],"correctIndex":number,"explanation":string}] (exactly 8),"cards":[{"front":string,"back":string}] (exactly 12),"viva":[{"question":string,"answer":string}] (exactly 8 oral-exam style questions with concise model answers)}';
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await withGemini((ai, model) =>
          ai.models.generateContent({
            model,
            contents: [
              {
                role: "user",
                parts: [
                  { inlineData: { mimeType: "application/pdf", data: data.base64 } },
                  { text: `Build the study kit for this PDF (${data.fileName}).` },
                ],
              },
            ],
            config: { systemInstruction: system, responseMimeType: "application/json" },
          }),
        );
        const kit = KitSchema.parse(parseModelJson(res.text ?? ""));
        return {
          ...kit,
          questions: kit.questions
            .filter((q) => q.options.length >= 2)
            .map((q) => ({
              ...q,
              correctIndex: Math.min(Math.max(Math.round(q.correctIndex), 0), q.options.length - 1),
            })),
        };
      } catch (error) {
        lastError = error;
        console.error(error);
        if (isTemporaryError(error) || (error instanceof Error && /GEMINI_API_KEY|401|403|400/.test(error.message))) break;
      }
    }
    throw friendlyGeminiError(lastError);
  });
