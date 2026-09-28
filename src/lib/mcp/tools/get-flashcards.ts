import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { findTopic } from "../study";

export default defineTool({
  name: "get_topic_flashcards",
  title: "Get flashcards and quiz",
  description: "Get the flashcards and multiple-choice questions for one of the learner's topics.",
  inputSchema: { topicId: z.string().min(1).describe("Topic id from list_topics.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ topicId }, ctx) => {
    const t = await findTopic(ctx, topicId);
    const flashcards = t.flashcards.map((c) => ({ front: c.front, back: c.back, known: c.known }));
    const questions = t.mcqs.map((q) => ({
      question: q.question,
      options: q.options.map((o) => o),
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    }));
    const out = { title: t.title, flashcards, questions };
    return { content: [{ type: "text", text: JSON.stringify(out) }], structuredContent: out };
  },
});
