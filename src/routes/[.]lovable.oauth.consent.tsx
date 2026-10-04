import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { StudyShell } from "@/components/StudyShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type OAuthResult = { data: any; error: { message: string } | null };
const oauth = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
    approveAuthorization: (id: string) => Promise<OAuthResult>;
    denyAuthorization: (id: string) => Promise<OAuthResult>;
  };
}).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Connect an app — Study Lab" },
      { name: "description", content: "Approve an AI assistant to access your Study Lab topics." },
      { property: "og:title", content: "Connect an app — Study Lab" },
      { property: "og:description", content: "Approve an AI assistant to access your Study Lab topics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth", search: { next: location.pathname + location.searchStr } });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth.getAuthorizationDetails(id);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <StudyShell>
      <div className="paper p-8 text-center">Could not load this request: {String((error as Error | undefined)?.message ?? error)}</div>
    </StudyShell>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = details?.client?.name ?? "An app";

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    const target = data?.redirect_url ?? data?.redirect_to;
    if (error || !target) {
      setBusy(false);
      setError(error?.message ?? "No redirect returned.");
      return;
    }
    window.location.href = target;
  }

  return (
    <StudyShell>
      <div className="paper mx-auto max-w-md p-8 text-center">
        <p className="section-label">Agent access</p>
        <h1 className="mt-2 text-2xl">Connect {name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {name} will be able to read your topics, notes, flashcards and progress.
        </p>
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" disabled={busy} onClick={() => decide(false)}>Deny</Button>
          <Button disabled={busy} onClick={() => decide(true)}>Approve</Button>
        </div>
      </div>
    </StudyShell>
  );
}
