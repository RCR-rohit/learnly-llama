import { Link } from "@tanstack/react-router";
import { BookOpen, MessagesSquare, GraduationCap } from "lucide-react";
import type { ReactNode } from "react";

export function StudyShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-4" />
            </span>
            <span className="font-display text-xl">Study Lab</span>
          </Link>
          <nav className="ml-auto flex items-center gap-1 text-sm">
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&.active]:bg-secondary [&.active]:text-foreground"
              activeOptions={{ exact: true }}
            >
              <BookOpen className="size-4" /> Topics
            </Link>
            <Link
              to="/ask"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&.active]:bg-secondary [&.active]:text-foreground"
            >
              <MessagesSquare className="size-4" /> Ask
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
