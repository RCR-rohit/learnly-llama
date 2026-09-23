import { Link } from "@tanstack/react-router";
import { BookOpen, MessagesSquare, GraduationCap } from "lucide-react";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";

export function StudyShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background/70">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-md border border-primary/40 bg-primary/15 text-primary shadow-[var(--shadow-glow)] transition-transform group-hover:scale-105">
              <GraduationCap className="size-4" />
            </span>
            <span className="font-display text-lg font-bold">Study Lab</span>
          </Link>
          <nav className="ml-auto flex items-center gap-1 rounded-md border border-border bg-secondary/30 p-1 text-sm">
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&.active]:bg-primary/15 [&.active]:text-primary"
              activeOptions={{ exact: true }}
            >
              <BookOpen className="size-4" /> Topics
            </Link>
            <Link
              to="/ask"
              className="flex items-center gap-1.5 rounded px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&.active]:bg-primary/15 [&.active]:text-primary"
            >
              <MessagesSquare className="size-4" /> Ask
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">{children}</main>
    </div>
  );
}
