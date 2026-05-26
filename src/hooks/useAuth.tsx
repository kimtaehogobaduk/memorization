import { useEffect, useState, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { syncLocalDataToSupabase } from "@/utils/syncLocalData";

// Shared module-level state to prevent loading flicker on navigation
type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
};

let sharedState: AuthState = {
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
};

const listeners = new Set<(s: AuthState) => void>();
let initialized = false;
let syncedFor: string | null = null;

const setShared = (patch: Partial<AuthState>) => {
  sharedState = { ...sharedState, ...patch };
  listeners.forEach((l) => l(sharedState));
};

const checkAdminRole = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setShared({ isAdmin: !error && !!data });
  } catch (error) {
    console.error("Error checking admin role:", error);
    setShared({ isAdmin: false });
  }
};

const initAuth = () => {
  if (initialized) return;
  initialized = true;

  supabase.auth.onAuthStateChange((_event, session) => {
    setShared({ session, user: session?.user ?? null, loading: false });
    if (session?.user) {
      setTimeout(() => checkAdminRole(session.user.id), 0);
      if (syncedFor !== session.user.id) {
        syncedFor = session.user.id;
        syncLocalDataToSupabase(session.user.id).then((count) => {
          if (count && count > 0) console.log(`Synced ${count} local vocabularies to cloud`);
        });
      }
    } else {
      setShared({ isAdmin: false });
      syncedFor = null;
    }
  });

  supabase.auth.getSession().then(({ data: { session } }) => {
    setShared({ session, user: session?.user ?? null, loading: false });
    if (session?.user) setTimeout(() => checkAdminRole(session.user.id), 0);
  });
};

export const useAuth = () => {
  const [state, setState] = useState<AuthState>(sharedState);
  const navigate = useNavigate();

  useEffect(() => {
    initAuth();
    const listener = (s: AuthState) => setState(s);
    listeners.add(listener);
    // Sync in case state changed between render and subscribe
    setState(sharedState);
    return () => { listeners.delete(listener); };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl, data: { full_name: fullName } },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) navigate("/auth");
    return { error };
  };

  return {
    user: state.user,
    session: state.session,
    loading: state.loading,
    isAdmin: state.isAdmin,
    signUp,
    signIn,
    signOut,
  };
};
