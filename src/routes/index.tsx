import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkle, Trash2 } from "lucide-react";

import { StudyShell } from "@/components/StudyShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { generateNotes } from "@/lib/study.functions";
import { createTopic, deleteTopic, topicProgress, updateTopic, useStudyState } from "@/lib/study-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Study Lab — AI notes, quizzes and flashcards" },
      {
        name: "description",
        content:
          "Turn any subject into simple AI notes, practice quizzes, flashcards and a tutor you can ask questions.",
      },
      { property: "og:title", content: "Study Lab — AI notes, quizzes and flashcards" },
      {
        property: "og:description",
        content: "Turn any subject into simple AI notes, quizzes and flashcards, and track what you know.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { topics } = useStudyState();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [material, setMaterial] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    const topic = createTopic(title);
    try {
      const { notes } = await generateNotes({
        data: { topic: topic.title, detail: material.trim() || null },
      });
      updateTopic(topic.id, { notes });
      setTitle("");
      setMaterial("");
      navigate({ to: "/topic/$topicId", params: { topicId: topic.id } });
    } catch (error) {
      console.error(error);
      deleteTopic(topic.id);
      toast.error("Couldn't write those notes. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <StudyShell>
      <section className="text-center">
        <h1 className="text-balance text-4xl leading-tight sm:text-5xl">
          Learn anything, one simple page at a time
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Type a subject. Get easy notes, a practice quiz, flashcards and a tutor who answers your
          questions — and watch your progress grow.
        </p>
      </section>

      <form onSubmit={handleCreate} className="paper mt-8 space-y-3 p-5">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you want to study? e.g. Photosynthesis, SQL joins, World War I causes"
          className="h-12 text-base"
          disabled={busy}
        />
        <Textarea
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          placeholder="Optional: paste your textbook text, lecture notes or a syllabus to base the notes on."
          rows={3}
          disabled={busy}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={busy || !title.trim()} className="gap-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkle className="size-4" />}
            {busy ? "Writing your notes…" : "Generate notes"}
          </Button>
        </div>
      </form>

      <section className="mt-10">
        <h2 className="text-2xl">Your topics</h2>
        {topics.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nothing here yet — your first topic will appear once you generate notes.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {topics.map((topic) => {
              const p = topicProgress(topic);
              return (
                <li key={topic.id} className="paper group relative p-4">
                  <Link
                    to="/topic/$topicId"
                    params={{ topicId: topic.id }}
                    className="block"
                  >
                    <h3 className="pr-8 text-lg">{topic.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {topic.mcqs.length} questions · {p.known}/{p.cards} cards known
                      {p.best ? ` · best quiz ${p.best}%` : ""}
                    </p>
                    <Progress value={p.mastery} className="mt-3 h-2" />
                  </Link>
                  <button
                    type="button"
                    aria-label={`Delete ${topic.title}`}
                    onClick={() => deleteTopic(topic.id)}
                    className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-secondary hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </StudyShell>
  );
}
