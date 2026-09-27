import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { getStudyState, replaceStudyState, subscribeStudy, type StudyState } from "@/lib/study-store";

export type Profile = { display_name: string | null; avatar_path: string | null };

type AuthCtx = {
  user: User | null;
  ready: boolean;
  profile: Profile | null;
  avatarUrl: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  ready: false,
  profile: null,
  avatarUrl: null,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setAvatarUrl(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_path")
      .eq("id", user.id)
      .maybeSingle();
    setProfile(data ?? { display_name: null, avatar_path: null });
    if (data?.avatar_path) {
      const { data: signed } = await supabase.storage
        .from("avatars")
        .createSignedUrl(data.avatar_path, 60 * 60 * 24 * 7);
      setAvatarUrl(signed?.signedUrl ?? null);
    } else setAvatarUrl(null);
  }, [user]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  useStudySync(user?.id ?? null);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <Ctx.Provider value={{ user, ready, profile, avatarUrl, refreshProfile, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

/** Keeps topics & chats saved to the signed-in account. */
function useStudySync(userId: string | null) {
  const syncing = useRef(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const push = async () => {
      const s = getStudyState();
      await supabase
        .from("study_data")
        .upsert({ user_id: userId, data: s as never, updated_at: new Date().toISOString() });
    };

    (async () => {
      syncing.current = true;
      const { data } = await supabase.from("study_data").select("data").eq("user_id", userId).maybeSingle();
      if (cancelled) return;
      const remote = (data?.data ?? null) as Partial<StudyState> | null;
      const local = getStudyState();
      if (remote && (remote.topics?.length || remote.threads?.length)) {
        // merge: remote wins, keep local-only items
        const topicIds = new Set((remote.topics ?? []).map((t) => t.id));
        const threadIds = new Set((remote.threads ?? []).map((t) => t.id));
        replaceStudyState({
          topics: [...(remote.topics ?? []), ...local.topics.filter((t) => !topicIds.has(t.id))],
          threads: [...(remote.threads ?? []), ...local.threads.filter((t) => !threadIds.has(t.id))],
        });
      }
      await push();
      syncing.current = false;
    })();

    const unsub = subscribeStudy(() => {
      if (syncing.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => void push(), 800);
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsub();
    };
  }, [userId]);
}
