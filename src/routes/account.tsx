import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera, LogOut } from "lucide-react";

import { StudyShell } from "@/components/StudyShell";
import { UserAvatar } from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your profile — Study Lab" },
      { name: "description", content: "Update your Study Lab name and profile photo." },
      { property: "og:title", content: "Your profile — Study Lab" },
      { property: "og:description", content: "Update your Study Lab name and profile photo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, ready, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setName(profile?.display_name ?? ""), [profile]);

  if (!ready) return <StudyShell>{null}</StudyShell>;
  if (!user)
    return (
      <StudyShell>
        <div className="mx-auto max-w-md text-center">
          <h1 className="text-3xl">Log in to see your profile</h1>
          <Button asChild className="mt-6"><Link to="/auth">Log in</Link></Button>
        </div>
      </StudyShell>
    );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({ id: user!.id, display_name: name.trim() || null, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    toast.success("Profile saved.");
  }

  async function upload(file: File) {
    const path = `${user!.id}/avatar-${Date.now()}.${file.name.split(".").pop() ?? "png"}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    await supabase.from("profiles").upsert({ id: user!.id, avatar_path: path, updated_at: new Date().toISOString() });
    await refreshProfile();
    toast.success("Photo updated.");
  }

  return (
    <StudyShell>
      <div className="mx-auto max-w-md">
        <p className="section-label">Profile</p>
        <h1 className="mt-2 text-3xl">Your account</h1>
        <form onSubmit={save} className="cyber-panel mt-6 space-y-5 p-6">
          <div className="flex items-center gap-4">
            <label className="group relative cursor-pointer">
              <UserAvatar className="size-16 text-lg" />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 opacity-0 transition group-hover:opacity-100">
                <Camera className="size-5" />
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
            <div className="min-w-0">
              <p className="truncate font-semibold">{profile?.display_name || "No name yet"}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dn">Display name</Label>
            <Input id="dn" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>Save</Button>
            <Button type="button" variant="outline" className="gap-2" onClick={async () => { await signOut(); navigate({ to: "/auth", replace: true }); }}>
              <LogOut className="size-4" /> Log out
            </Button>
          </div>
        </form>
      </div>
    </StudyShell>
  );
}
