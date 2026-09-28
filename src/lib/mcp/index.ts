import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTopics from "./tools/list-topics";
import getNotes from "./tools/get-notes";
import getFlashcards from "./tools/get-flashcards";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "study-buddy-ai",
  title: "Study Buddy AI",
  version: "0.1.0",
  instructions:
    "Access the signed-in learner's Study Lab topics. Use `list_topics` first, then `get_topic_notes` or `get_topic_flashcards` with a topic id.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTopics, getNotes, getFlashcards],
});
