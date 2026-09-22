import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Check, Loader2, MessagesSquare, RotateCcw, Sparkle, X } from "lucide-react";

import { StudyShell } from "@/components/StudyShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateFlashcards, generateMcqs, generateNotes } from "@/lib/study.functions";
import {
  createThread,
  newId,
  recordAttempt,
  toggleCardKnown,
  topicProgress,
  updateTopic,
  useStudyState,
  type Topic,
} from "@/lib/study-store";

export const Route = createFileRoute("/topic/$topicId")({
  head: () => ({
    meta: [
      { title: "Topic — Study Lab" },
      { name: "description", content: "Your AI notes, practice quiz and flashcards for this topic." },
      { property: "og:title", content: "Topic — Study Lab" },
      { property: "og:description", content: "AI notes, practice quiz and flashcards for this topic." },
    ],
  }),
  component: TopicPage,
});

function TopicPage() {
  const { topicId } = Route.useParams();
  const { topics } = useStudyState();
  const topic = topics.find((t) => t.id === topicId);

  if (!topic) {
    return (
      <StudyShell>
        <div className="paper p-8 text-center">
          <h1 className="text-2xl">Topic not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            It may have been deleted from this browser.
          </p>
          <Link to="/" className="mt-4 inline-block text-primary underline">
            Back to topics
          </Link>
        </div>
      </StudyShell>
    );
  }

  return <TopicView topic={topic} />;
}

function TopicView({ topic }: { topic: Topic }) {
  const navigate = useNavigate();
  const p = topicProgress(topic);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(kind: "notes" | "quiz" | "cards") {
    setBusy(kind);
    try {
      if (kind === "notes") {
        const { notes } = await generateNotes({ data: { topic: topic.title, detail: null } });
        updateTopic(topic.id, { notes });
      } else if (kind === "quiz") {
        const { questions } = await generateMcqs({
          data: { topic: topic.title, notes: topic.notes, count: 6 },
        });
        updateTopic(topic.id, { mcqs: questions });
      } else {
        const { cards } = await generateFlashcards({
          data: { topic: topic.title, notes: topic.notes, count: 10 },
        });
        updateTopic(topic.id, {
          flashcards: cards.map((c) => ({ ...c, id: newId(), known: false })),
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("That didn't work. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  function askAboutTopic() {
    const thread = createThread("New question", topic.id);
    navigate({ to: "/ask/$threadId", params: { threadId: thread.id } });
  }

  return (
    <StudyShell>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <Link to="/" className="section-label hover:text-foreground">
            ← All topics
          </Link>
          <h1 className="mt-3 text-3xl sm:text-4xl">{topic.title}</h1>
        </div>
        <Button variant="outline" onClick={askAboutTopic} className="gap-2">
          <MessagesSquare className="size-4" /> Ask about this
        </Button>
      </div>

      <div className="paper mt-6 grid grid-cols-2 gap-5 p-5 sm:grid-cols-[repeat(4,auto)_1fr] sm:items-center sm:gap-7">
        <Stat label="Mastery" value={`${p.mastery}%`} />
        <Stat label="Cards known" value={`${p.known}/${p.cards}`} />
        <Stat label="Best quiz" value={p.best ? `${p.best}%` : "—"} />
        <Stat label="Quizzes taken" value={`${topic.attempts.length}`} />
        <div className="col-span-2 min-w-40 sm:col-span-1 sm:flex-1">
          <Progress value={p.mastery} className="h-2" />
        </div>
      </div>

      <Tabs defaultValue="notes" className="mt-6">
        <TabsList className="h-auto w-full justify-start overflow-x-auto border border-border bg-secondary/30 p-1 sm:w-auto">
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="quiz">Quiz</TabsTrigger>
          <TabsTrigger value="cards">Flashcards</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="mt-4">
          <div className="paper p-6 sm:p-8">
            {topic.notes ? (
              <div className="notes-prose">
                <ReactMarkdown>{topic.notes}</ReactMarkdown>
              </div>
            ) : (
              <Empty text="No notes yet." />
            )}
            <div className="mt-6">
              <Button variant="outline" onClick={() => run("notes")} disabled={busy !== null} className="gap-2">
                {busy === "notes" ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                {topic.notes ? "Rewrite notes" : "Generate notes"}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="quiz" className="mt-4">
          {topic.mcqs.length === 0 ? (
            <div className="paper p-6">
              <Empty text="No practice questions yet." />
              <Button onClick={() => run("quiz")} disabled={busy !== null} className="mt-4 gap-2">
                {busy === "quiz" ? <Loader2 className="size-4 animate-spin" /> : <Sparkle className="size-4" />}
                Generate quiz
              </Button>
            </div>
          ) : (
            <Quiz topic={topic} onRegenerate={() => run("quiz")} regenerating={busy === "quiz"} />
          )}
        </TabsContent>

        <TabsContent value="cards" className="mt-4">
          {topic.flashcards.length === 0 ? (
            <div className="paper p-6">
              <Empty text="No flashcards yet." />
              <Button onClick={() => run("cards")} disabled={busy !== null} className="mt-4 gap-2">
                {busy === "cards" ? <Loader2 className="size-4 animate-spin" /> : <Sparkle className="size-4" />}
                Generate flashcards
              </Button>
            </div>
          ) : (
            <Flashcards topic={topic} onRegenerate={() => run("cards")} regenerating={busy === "cards"} />
          )}
        </TabsContent>

        <TabsContent value="progress" className="mt-4">
          <div className="paper p-6">
            <h3 className="text-xl">Quiz history</h3>
            {topic.attempts.length === 0 ? (
              <Empty text="Take a quiz to start tracking your scores." />
            ) : (
              <ul className="mt-3 space-y-2">
                {[...topic.attempts].reverse().map((a) => (
                  <li
                    key={a.at}
                    className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm"
                  >
                    <span>{new Date(a.at).toLocaleString()}</span>
                    <span className="font-medium">
                      {a.score}/{a.total} · {Math.round((a.score / a.total) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </StudyShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-2xl">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function Quiz({
  topic,
  onRegenerate,
  regenerating,
}: {
  topic: Topic;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const score = useMemo(
    () => topic.mcqs.filter((q, i) => answers[i] === q.correctIndex).length,
    [answers, topic.mcqs],
  );

  function submit() {
    setSubmitted(true);
    recordAttempt(topic.id, score, topic.mcqs.length);
  }

  return (
    <div className="space-y-4">
      {topic.mcqs.map((q, i) => (
        <div key={i} className="paper p-5">
          <p className="font-medium">
            {i + 1}. {q.question}
          </p>
          <div className="mt-3 space-y-2">
            {q.options.map((opt, oi) => {
              const chosen = answers[i] === oi;
              const correct = q.correctIndex === oi;
              const state = submitted
                ? correct
                  ? "border-success bg-success/10"
                  : chosen
                    ? "border-destructive bg-destructive/10"
                    : "border-border"
                : chosen
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-secondary";
              return (
                <button
                  key={oi}
                  type="button"
                  disabled={submitted}
                  onClick={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${state}`}
                >
                  {submitted && correct && <Check className="size-4 text-success" />}
                  {submitted && chosen && !correct && <X className="size-4 text-destructive" />}
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
          {submitted && (
            <p className="mt-3 text-sm text-muted-foreground">{q.explanation}</p>
          )}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        {!submitted ? (
          <Button onClick={submit} disabled={Object.keys(answers).length < topic.mcqs.length}>
            Check answers
          </Button>
        ) : (
          <>
            <p className="font-display text-2xl">
              {score}/{topic.mcqs.length} correct
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setAnswers({});
                setSubmitted(false);
              }}
              className="gap-2"
            >
              <RotateCcw className="size-4" /> Retake
            </Button>
          </>
        )}
        <Button variant="ghost" onClick={onRegenerate} disabled={regenerating} className="gap-2">
          {regenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkle className="size-4" />}
          New questions
        </Button>
      </div>
    </div>
  );
}

function Flashcards({
  topic,
  onRegenerate,
  regenerating,
}: {
  topic: Topic;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = topic.flashcards[Math.min(index, topic.flashcards.length - 1)];

  function next(known: boolean) {
    if (!card) return;
    toggleCardKnown(topic.id, card.id, known);
    setFlipped(false);
    setIndex((i) => (i + 1) % topic.flashcards.length);
  }

  if (!card) return null;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="paper flex min-h-52 w-full flex-col items-center justify-center gap-2 p-8 text-center transition hover:border-primary"
      >
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {flipped ? "Answer" : "Card " + (index + 1) + " of " + topic.flashcards.length}
        </span>
        <span className="font-display text-2xl">{flipped ? card.back : card.front}</span>
        {!flipped && <span className="text-xs text-muted-foreground">Tap to flip</span>}
      </button>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => next(false)} className="gap-2">
          <RotateCcw className="size-4" /> Still learning
        </Button>
        <Button onClick={() => next(true)} className="gap-2">
          <Check className="size-4" /> I know this
        </Button>
        <Button variant="ghost" onClick={onRegenerate} disabled={regenerating} className="gap-2">
          {regenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkle className="size-4" />}
          New set
        </Button>
      </div>
    </div>
  );
}
