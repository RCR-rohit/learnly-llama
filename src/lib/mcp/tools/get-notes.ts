import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { findTopic } from "../study";

export default defineTool({
  name: "get_topic_notes",
  title: "Get topic notes",
  description: "Get the study notes (markdown) for one of the learner's topics.",
  inputSchema: { topicId: z.string().min(1).describe("Topic id from list_topics.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ topicId }, ctx) => {
    const t = await findTopic(ctx, topicId);
    return { content: [{ type: "text", text: t.notes ?? "This topic has no notes yet." }] };
  },
});
