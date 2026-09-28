import type { ToolContext } from "@lovable.dev/mcp-js";
import { ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "./supabase";

type Topic = {
  id: string;
  title: string;
  createdAt: number;
  notes: string | null;
  mcqs: { question: string; options: string[]; correctIndex: number; explanation: string }[];
  flashcards: { id: string; front: string; back: string; known: boolean }[];
  attempts: { at: number; score: number; total: number }[];
};

export async function loadTopics(ctx: ToolContext): Promise<Topic[]> {
  if (!ctx.isAuthenticated()) throw new ToolError("Not signed in");
  const { data, error } = await supabaseForUser(ctx)
    .from("study_data")
    .select("data")
    .eq("user_id", ctx.getUserId()!)
    .maybeSingle();
  if (error) throw new ToolError(error.message);
  const d = (data?.data ?? {}) as { topics?: Topic[] };
  return Array.isArray(d.topics) ? d.topics : [];
}

export function progress(t: Topic) {
  const known = t.flashcards.filter((c) => c.known).length;
  const best = t.attempts.reduce((m, a) => Math.max(m, a.total ? a.score / a.total : 0), 0);
  const cardPct = t.flashcards.length ? known / t.flashcards.length : 0;
  return {
    mastery: Math.round((cardPct * 0.5 + best * 0.5) * 100),
    knownCards: known,
    totalCards: t.flashcards.length,
    bestQuizPercent: Math.round(best * 100),
    quizAttempts: t.attempts.length,
  };
}

export async function findTopic(ctx: ToolContext, id: string) {
  const t = (await loadTopics(ctx)).find((x) => x.id === id);
  if (!t) throw new ToolError(`No topic with id ${id}`);
  return t;
}
