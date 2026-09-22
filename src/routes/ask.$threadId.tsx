import { useChat } from "@ai-sdk/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { StudyShell } from "@/components/StudyShell";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import {
  createThread,
  deleteThread,
  saveThreadMessages,
  useStudyState,
  type Thread,
} from "@/lib/study-store";

export const Route = createFileRoute("/ask/$threadId")({
  head: () => ({
    meta: [
      { title: "Tutor chat — Study Lab" },
      { name: "description", content: "Ask follow-up questions and get simple explanations." },
      { property: "og:title", content: "Tutor chat — Study Lab" },
      { property: "og:description", content: "Ask follow-up questions and get simple explanations." },
    ],
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const { threads } = useStudyState();
  const thread = threads.find((t) => t.id === threadId);

  if (!thread) {
    return (
      <StudyShell>
        <div className="paper p-8 text-center">
          <h1 className="text-2xl">Chat not found</h1>
          <Link to="/ask" className="mt-3 inline-block text-primary underline">
            Back to chats
          </Link>
        </div>
      </StudyShell>
    );
  }

  return <ChatView key={thread.id} thread={thread} />;
}

function ChatView({ thread }: { thread: Thread }) {
  const { threads, topics } = useStudyState();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const topic = topics.find((t) => t.id === thread.topicId);
  const initialMessages = useMemo(() => thread.messages, [thread.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { context: topic?.notes ?? null },
      }),
    [topic?.notes],
  );

  const { messages, sendMessage, status } = useChat({
    id: thread.id,
    messages: initialMessages,
    transport,
    onError: (error) => {
      console.error(error);
      toast.error("The tutor couldn't answer right now. Please try again.");
    },
    onFinish: ({ messages: finished }) => {
      saveThreadMessages(thread.id, finished as UIMessage[]);
    },
  });

  useEffect(() => {
    textareaRef.current?.focus();
  }, [thread.id, status]);

  const isLoading = status === "submitted" || status === "streaming";

  function handleSubmit(_message: unknown, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    void sendMessage({ text });
  }

  function startNew() {
    const next = createThread("New question", thread.topicId);
    navigate({ to: "/ask/$threadId", params: { threadId: next.id } });
  }

  return (
    <StudyShell>
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="hidden md:block">
          <Button onClick={startNew} className="w-full gap-2">
            <Plus className="size-4" /> New chat
          </Button>
          <ul className="mt-3 space-y-1">
            {threads.map((t) => (
              <li
                key={t.id}
                className={`flex items-center gap-1 rounded-lg px-2 ${
                  t.id === thread.id ? "bg-secondary" : "hover:bg-secondary/60"
                }`}
              >
                <Link
                  to="/ask/$threadId"
                  params={{ threadId: t.id }}
                  className="min-w-0 flex-1 truncate py-2 text-sm"
                >
                  {t.title}
                </Link>
                <button
                  type="button"
                  aria-label={`Delete ${t.title}`}
                  onClick={() => {
                    deleteThread(t.id);
                    if (t.id === thread.id) navigate({ to: "/ask" });
                  }}
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="paper flex h-[70vh] flex-col overflow-hidden">
          <header className="border-b border-border px-4 py-3">
            <h1 className="truncate text-lg">{thread.title}</h1>
            {topic && (
              <p className="text-xs text-muted-foreground">Using your notes on {topic.title}</p>
            )}
          </header>

          <Conversation className="flex-1">
            <ConversationContent>
              {messages.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Ask anything — "explain this simply", "give me an example", "why is this wrong?"
                </p>
              )}
              {messages.map((message) => (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.parts.map((part, i) =>
                      part.type === "text" ? (
                        <MessageResponse key={i}>{part.text}</MessageResponse>
                      ) : null,
                    )}
                  </MessageContent>
                </Message>
              ))}
              {status === "submitted" && <Shimmer className="text-sm">Thinking…</Shimmer>}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="border-t border-border p-3">
            <PromptInput onSubmit={handleSubmit}>
              <PromptInputTextarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your tutor a question…"
              />
              <PromptInputFooter className="justify-end">
                <PromptInputSubmit status={status} disabled={!input.trim() || isLoading} />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </section>
      </div>
    </StudyShell>
  );
}
