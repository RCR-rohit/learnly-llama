import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { StudyShell } from "@/components/StudyShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Study Lab" },
      { name: "description", content: "Choose a new password for your Study Lab account." },
      { property: "og:title", content: "Reset password — Study Lab" },
      { property: "og:description", content: "Choose a new password for your Study Lab account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated.");
    navigate({ to: "/" });
  }

  return (
    <StudyShell>
      <form onSubmit={submit} className="cyber-panel mx-auto max-w-md space-y-4 p-6">
        <h1 className="text-2xl">Set a new password</h1>
        <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" />
        <Button type="submit" disabled={busy} className="w-full">Save password</Button>
      </form>
    </StudyShell>
  );
}
