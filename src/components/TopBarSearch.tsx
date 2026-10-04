import { useNavigate } from "@tanstack/react-router";
import { Search, FileText, MessageSquareText, Layers, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { topicProgress, useStudyState } from "@/lib/study-store";

type Result = {
  kind: "topic" | "card" | "thread";
  topicId: string;
  threadId?: string;
  title: string;
  snippet: string;
};

const MAX_RESULTS = 8;

function normalize(value: string) {
  return value.toLowerCase().trim();
}

export function TopBarSearch() {
  const navigate = useNavigate();
  const { topics, threads } = useStudyState();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo<Result[]>(() => {
    const q = normalize(query);
    if (q.length < 2) return [];
    const out: Result[] = [];

    for (const topic of topics) {
      const progress = topicProgress(topic);
      if (normalize(topic.title).includes(q)) {
        out.push({
          kind: "topic",
          topicId: topic.id,
          title: topic.title,
          snippet: [
            progress.cards ? `${progress.cards} flashcards` : null,
            topic.mcqs.length ? `${topic.mcqs.length} quiz questions` : null,
            topic.notes ? "notes ready" : null,
          ]
            .filter(Boolean)
            .join(" · ") || "No study material yet",
        });
      }
      for (const card of topic.flashcards) {
        if (normalize(card.front).includes(q) || normalize(card.back).includes(q)) {
          out.push({
            kind: "card",
            topicId: topic.id,
            title: card.front,
            snippet: `${topic.title} · flashcard`,
          });
        }
      }
    }

    for (const thread of threads) {
      const text = thread.messages
        .map((m) =>
          m.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join(" "),
        )
        .join(" ");
      if (normalize(thread.title).includes(q) || normalize(text).includes(q)) {
        out.push({
          kind: "thread",
          topicId: thread.topicId ?? "",
          threadId: thread.id,
          title: thread.title,
          snippet: `${thread.messages.length} messages · Ask`,
        });
      }
    }

    return out.slice(0, MAX_RESULTS);
  }, [query, topics, threads]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function go(result: Result) {
    setOpen(false);
    setQuery("");
    if (result.kind === "thread" && result.threadId) {
      void navigate({ to: "/ask/$threadId", params: { threadId: result.threadId } });
    } else {
      void navigate({ to: "/topic/$topicId", params: { topicId: result.topicId } });
    }
  }

  const iconFor = (kind: Result["kind"]) =>
    kind === "topic" ? (
      <FileText className="size-3.5 shrink-0 text-primary" />
    ) : kind === "card" ? (
      <Layers className="size-3.5 shrink-0 text-accent" />
    ) : (
      <MessageSquareText className="size-3.5 shrink-0 text-primary" />
    );

  return (
    <div ref={boxRef} className="relative hidden min-w-0 flex-1 sm:block">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (results[0]) go(results[0]);
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder="Search topics, cards, chats…"
          aria-label="Search study material"
          className="h-9 w-full rounded-md border border-border bg-card/60 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus:border-primary/60 focus:bg-card focus:shadow-[var(--shadow-glow)]"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </form>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-11 z-30 overflow-hidden rounded-md border border-border bg-card/95 shadow-[var(--shadow-glow)] backdrop-blur-xl">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              No matches for “{query.trim()}”
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((result) => (
                <li key={`${result.kind}-${result.topicId}-${result.threadId ?? ""}-${result.title}`}>
                  <button
                    type="button"
                    onClick={() => go(result)}
                    className="flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-primary/10"
                  >
                    <span className="mt-0.5">{iconFor(result.kind)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {result.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {result.snippet}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
