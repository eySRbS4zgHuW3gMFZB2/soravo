import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient, type AppSupabaseClient } from "./supabase";
import {
  ensureProfile,
  getProfile,
  requestPasswordReset,
  signInWithEmail,
  signOut as serviceSignOut,
  signUpWithEmail,
  updateDisplayName as serviceUpdateDisplayName,
  updatePassword as serviceUpdatePassword,
  type Profile,
} from "./auth-service";

const UNAVAILABLE_MESSAGE = "Account sign-in is not configured on this deployment.";

type AuthResult = Promise<{ error: string | null }>;

type AuthContextValue = {
  client: AppSupabaseClient | null;
  user: User | null;
  loading: boolean;
  profile: Profile | null;
  signIn: (input: { email: string; password: string }) => AuthResult;
  signUp: (input: { email: string; password: string }) => AuthResult;
  resetPassword: (input: { email: string }) => AuthResult;
  updatePassword: (input: { password: string }) => AuthResult;
  signOut: () => Promise<void>;
  updateDisplayName: (displayName: string) => AuthResult;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  client: injectedClient,
  children,
}: {
  client?: AppSupabaseClient | null;
  children: ReactNode;
}) {
  const client = injectedClient !== undefined ? injectedClient : getSupabaseClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return;
    }
    let mounted = true;
    client.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    if (!client || !user) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    ensureProfile(client, user).then((loaded) => {
      if (!cancelled) setProfile(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [client, user]);

  const refreshProfile = useCallback(async () => {
    if (!client || !user) return;
    const loaded = await getProfile(client, user.id);
    if (loaded) setProfile(loaded);
  }, [client, user]);

  const signIn = useCallback<AuthContextValue["signIn"]>(
    async (input) => {
      if (!client) return { error: UNAVAILABLE_MESSAGE };
      return signInWithEmail(client, input);
    },
    [client],
  );

  const signUp = useCallback<AuthContextValue["signUp"]>(
    async (input) => {
      if (!client) return { error: UNAVAILABLE_MESSAGE };
      return signUpWithEmail(client, { ...input, emailRedirectTo: `${window.location.origin}/login` });
    },
    [client],
  );

  const resetPassword = useCallback<AuthContextValue["resetPassword"]>(
    async (input) => {
      if (!client) return { error: UNAVAILABLE_MESSAGE };
      return requestPasswordReset(client, {
        email: input.email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
    },
    [client],
  );

  const updatePassword = useCallback<AuthContextValue["updatePassword"]>(
    async (input) => {
      if (!client) return { error: UNAVAILABLE_MESSAGE };
      return serviceUpdatePassword(client, input);
    },
    [client],
  );

  const signOut = useCallback<AuthContextValue["signOut"]>(async () => {
    if (!client) return;
    await serviceSignOut(client);
  }, [client]);

  const updateDisplayName = useCallback<AuthContextValue["updateDisplayName"]>(
    async (displayName) => {
      if (!client || !user) return { error: "Sign in to update your display name." };
      const result = await serviceUpdateDisplayName(client, { userId: user.id, displayName });
      if (!result.error) await refreshProfile();
      return result;
    },
    [client, user, refreshProfile],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      client,
      user,
      loading,
      profile,
      signIn,
      signUp,
      resetPassword,
      updatePassword,
      signOut,
      updateDisplayName,
      refreshProfile,
    }),
    [client, user, loading, profile, signIn, signUp, resetPassword, updatePassword, signOut, updateDisplayName, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}