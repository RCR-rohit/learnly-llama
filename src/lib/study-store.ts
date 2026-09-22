import { useSyncExternalStore } from "react";
import type { UIMessage } from "ai";

export type Mcq = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  known: boolean;
};

export type QuizAttempt = {
  at: number;
  score: number;
  total: number;
};

export type Topic = {
  id: string;
  title: string;
  createdAt: number;
  notes: string | null;
  mcqs: Mcq[];
  flashcards: Flashcard[];
  attempts: QuizAttempt[];
};

export type Thread = {
  id: string;
  title: string;
  topicId: string | null;
  messages: UIMessage[];
  updatedAt: number;
};

type StudyState = {
  topics: Topic[];
  threads: Thread[];
};

const STORAGE_KEY = "study-lab:v1";
const empty: StudyState = { topics: [], threads: [] };

let state: StudyState = empty;
let loaded = false;
const listeners = new Set<() => void>();

function load(): StudyState {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<StudyState>;
    return {
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      threads: Array.isArray(parsed.threads) ? parsed.threads : [],
    };
  } catch {
    return empty;
  }
}

function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    state = load();
    loaded = true;
  }
  return state;
}

function setState(next: StudyState) {
  state = next;
  loaded = true;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage full or unavailable */
    }
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStudyState(): StudyState {
  return useSyncExternalStore(subscribe, ensureLoaded, () => empty);
}

export function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/* ---------- topics ---------- */

export function createTopic(title: string): Topic {
  const topic: Topic = {
    id: newId(),
    title: title.trim(),
    createdAt: Date.now(),
    notes: null,
    mcqs: [],
    flashcards: [],
    attempts: [],
  };
  const current = ensureLoaded();
  setState({ ...current, topics: [topic, ...current.topics] });
  return topic;
}

export function updateTopic(id: string, patch: Partial<Topic>) {
  const current = ensureLoaded();
  setState({
    ...current,
    topics: current.topics.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  });
}

export function deleteTopic(id: string) {
  const current = ensureLoaded();
  setState({
    ...current,
    topics: current.topics.filter((t) => t.id !== id),
    threads: current.threads.map((t) => (t.topicId === id ? { ...t, topicId: null } : t)),
  });
}

export function recordAttempt(id: string, score: number, total: number) {
  const current = ensureLoaded();
  setState({
    ...current,
    topics: current.topics.map((t) =>
      t.id === id ? { ...t, attempts: [...t.attempts, { at: Date.now(), score, total }] } : t,
    ),
  });
}

export function toggleCardKnown(topicId: string, cardId: string, known: boolean) {
  const current = ensureLoaded();
  setState({
    ...current,
    topics: current.topics.map((t) =>
      t.id === topicId
        ? { ...t, flashcards: t.flashcards.map((c) => (c.id === cardId ? { ...c, known } : c)) }
        : t,
    ),
  });
}

/* ---------- threads ---------- */

export function createThread(title: string, topicId: string | null = null): Thread {
  const thread: Thread = {
    id: newId(),
    title: title.trim() || "New question",
    topicId,
    messages: [],
    updatedAt: Date.now(),
  };
  const current = ensureLoaded();
  setState({ ...current, threads: [thread, ...current.threads] });
  return thread;
}

export function saveThreadMessages(id: string, messages: UIMessage[]) {
  const current = ensureLoaded();
  const thread = current.threads.find((t) => t.id === id);
  if (!thread) return;
  const firstUser = messages.find((m) => m.role === "user");
  const derivedTitle = firstUser
    ? firstUser.parts
        .map((p) => (p.type === "text" ? p.text : ""))
        .join(" ")
        .trim()
        .slice(0, 60)
    : "";
  setState({
    ...current,
    threads: current.threads.map((t) =>
      t.id === id
        ? {
            ...t,
            messages,
            updatedAt: Date.now(),
            title: t.title === "New question" && derivedTitle ? derivedTitle : t.title,
          }
        : t,
    ),
  });
}

export function deleteThread(id: string) {
  const current = ensureLoaded();
  setState({ ...current, threads: current.threads.filter((t) => t.id !== id) });
}

/* ---------- progress ---------- */

export function topicProgress(topic: Topic) {
  const cards = topic.flashcards.length;
  const known = topic.flashcards.filter((c) => c.known).length;
  const best = topic.attempts.reduce(
    (acc, a) => Math.max(acc, a.total ? Math.round((a.score / a.total) * 100) : 0),
    0,
  );
  const last = topic.attempts.at(-1);
  const mastery = Math.round(
    ((cards ? known / cards : 0) * 0.5 + (best / 100) * 0.5 + (topic.notes ? 0 : 0)) * 100,
  );
  return { cards, known, best, last, mastery };
}
