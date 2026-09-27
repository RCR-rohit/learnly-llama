import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, LogIn, UserPlus } from "lucide-react";

import { StudyShell } from "@/components/StudyShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Log in — Study Lab" },
      { name: "description", content: "Log in or create a Study Lab account to save your topics and chats." },
      { property: "og:title", content: "Log in — Study Lab" },
      { property: "og:description", content: "Save your notes, quizzes and flashcards to your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/", replace: true });
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim() || undefined } },
        });
        if (error) throw error;
        if (!data.session) toast.success("Check your email to confirm your account.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    if (!email) { toast.error("Enter your email first."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent.");
  }

  return (
    <StudyShell>
      <div className="mx-auto max-w-md">
        <p className="section-label text-center">Your account</p>
        <h1 className="mt-3 text-center text-4xl">{mode === "login" ? "Welcome back" : "Create account"}</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Save topics, quizzes and chats so they follow you on any device.
        </p>

        <div className="cyber-panel mt-8 p-6">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-md border border-border bg-secondary/30 p-1 text-sm">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded px-3 py-1.5 transition-colors ${mode === m ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {m === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={busy} className="w-full gap-2">
              {busy ? <Loader2 className="size-4 animate-spin" /> : mode === "login" ? <LogIn className="size-4" /> : <UserPlus className="size-4" />}
              {mode === "login" ? "Log in" : "Create account"}
            </Button>
            {mode === "login" && (
              <button type="button" onClick={forgot} className="block w-full text-center text-xs text-muted-foreground hover:text-primary">
                Forgot password?
              </button>
            )}
          </form>
        </div>
      </div>
    </StudyShell>
  );
}
