import { defineTool } from "@lovable.dev/mcp-js";
import { loadTopics, progress } from "../study";

export default defineTool({
  name: "list_topics",
  title: "List study topics",
  description: "List the signed-in learner's study topics with their progress.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const topics = (await loadTopics(ctx)).map((t) => ({
      id: t.id,
      title: t.title,
      hasNotes: !!t.notes,
      questions: t.mcqs.length,
      ...progress(t),
    }));
    return { content: [{ type: "text", text: JSON.stringify(topics) }], structuredContent: { topics } };
  },
});
