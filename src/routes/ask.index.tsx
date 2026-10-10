import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MessagesSquare, Plus, Trash2 } from "lucide-react";

import { StudyShell } from "@/components/StudyShell";
import { Button } from "@/components/ui/button";
import { createThread, deleteThread, useStudyState } from "@/lib/study-store";

export const Route = createFileRoute("/ask/")({
  head: () => ({
    meta: [
      { title: "Ask your tutor — Study Lab" },
      { name: "description", content: "Chat with an AI tutor about anything you are studying." },
      { property: "og:title", content: "Ask your tutor — Study Lab" },
      { property: "og:description", content: "Chat with an AI tutor about anything you are studying." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AskIndex,
});

function AskIndex() {
  const { threads, topics } = useStudyState();
  const navigate = useNavigate();

  function start() {
    const thread = createThread("New question");
    navigate({ to: "/ask/$threadId", params: { threadId: thread.id } });
  }

  return (
    <StudyShell>
      <div className="flex items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="section-label">AI tutor</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">Ask your tutor</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            One chat per question or topic, saved in this browser.
            <span className="rounded-full border border-border bg-secondary/40 px-2 py-0.5 font-mono text-[0.68rem] text-primary">
              {threads.length} {threads.length === 1 ? "chat" : "chats"}
            </span>
          </p>
        </div>
        <Button onClick={start} className="gap-2">
          <Plus className="size-4" /> New chat
        </Button>
      </div>

      {threads.length === 0 ? (
        <div className="paper mt-8 p-12 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary shadow-[var(--shadow-glow)]">
            <MessagesSquare className="size-6" />
          </span>
          <p className="mt-3 text-sm text-muted-foreground">
            No chats yet. Start one and ask anything you're stuck on.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {threads.map((thread) => {
            const topic = topics.find((t) => t.id === thread.topicId);
            return (
              <li key={thread.id} className="paper flex items-center gap-2 p-4 transition hover:border-primary/45">
                <Link
                  to="/ask/$threadId"
                  params={{ threadId: thread.id }}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary/40 text-primary">
                    <MessagesSquare className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <p className="truncate font-medium">{thread.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {topic ? `${topic.title} · ` : ""}
                      {new Date(thread.updatedAt).toLocaleString()}
                    </p>
                  </span>
                </Link>
                <button
                  type="button"
                  aria-label={`Delete ${thread.title}`}
                  onClick={() => deleteThread(thread.id)}
                  className="rounded-md p-2 text-muted-foreground transition hover:bg-secondary hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </StudyShell>
  );
}
