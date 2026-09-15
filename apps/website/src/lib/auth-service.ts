import type { User } from "@supabase/supabase-js";
import type { AppSupabaseClient } from "./supabase";

export type Profile = {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export const DISPLAY_NAME_MAX = 80;

export type SignOutScope = "global" | "local" | "others";

export type UpdatePasswordResult =
  | { error: string | null; reauthRequired?: false }
  | { error: null; reauthRequired: true };

const GENERIC_SIGNIN_MESSAGE =
  "We couldn't sign you in. Check your email and password, then try again.";
const GENERIC_SIGNUP_MESSAGE =
  "We couldn't create your account. Please try again.";
const GENERIC_RESET_MESSAGE =
  "If that email is registered, a password reset link is on its way.";
const GENERIC_PASSWORD_MESSAGE =
  "We couldn't update your password. Try again, or request a new reset link.";
const GENERIC_SYNC_MESSAGE = "We couldn't sync your account. Please try again.";
const GENERIC_REAUTH_SEND_MESSAGE =
  "We couldn't send a verification code. Try again.";

function genericError(message: string): string {
  return message;
}

function asMessage(error: { message?: string } | null): string {
  return error?.message ?? "An unexpected error occurred.";
}

// All methods surface generic, action-shaped messages so a remote caller
// cannot distinguish "no account for this email" from "wrong password"
// (account-enumeration mitigation). Sign-in and sign-up share the same
// wording space; reset never reveals whether an email is registered.

export async function signInWithEmail(
  client: AppSupabaseClient,
  input: { email: string; password: string },
): Promise<{ error: string | null }> {
  const { error } = await client.auth.signInWithPassword(input);
  if (error) return { error: genericError(GENERIC_SIGNIN_MESSAGE) };
  return { error: null };
}

export async function signUpWithEmail(
  client: AppSupabaseClient,
  input: { email: string; password: string; emailRedirectTo?: string },
): Promise<{ error: string | null }> {
  const { error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: input.emailRedirectTo ? { emailRedirectTo: input.emailRedirectTo } : undefined,
  });
  if (error) return { error: genericError(GENERIC_SIGNUP_MESSAGE) };
  return { error: null };
}

export async function requestPasswordReset(
  client: AppSupabaseClient,
  input: { email: string; redirectTo: string },
): Promise<{ error: string | null }> {
  const { error } = await client.auth.resetPasswordForEmail(input.email, {
    redirectTo: input.redirectTo,
  });
  // Swallow failures deliberately: both paths report the same neutral
  // message so the response never confirms whether an email is registered.
  if (error) return { error: genericError(GENERIC_RESET_MESSAGE) };
  return { error: null };
}

export async function updatePassword(
  client: AppSupabaseClient,
  input: { password: string; nonce?: string },
): Promise<UpdatePasswordResult> {
  const payload: { password: string; nonce?: string } = { password: input.password };
  if (input.nonce) payload.nonce = input.nonce;
  const { error } = await client.auth.updateUser(payload);
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "reauthentication_needed") {
      return { error: null, reauthRequired: true };
    }
    return { error: genericError(GENERIC_PASSWORD_MESSAGE) };
  }
  return { error: null, reauthRequired: false };
}

export async function requestReauthentication(
  client: AppSupabaseClient,
): Promise<{ error: string | null }> {
  const { error } = await client.auth.reauthenticate();
  if (error) return { error: genericError(GENERIC_REAUTH_SEND_MESSAGE) };
  return { error: null };
}

export async function signOut(
  client: AppSupabaseClient,
  options?: { scope?: SignOutScope },
): Promise<{ error: string | null }> {
  const { error } = await client.auth.signOut({ scope: options?.scope ?? "local" });
  if (error) return { error: genericError(GENERIC_SYNC_MESSAGE) };
  return { error: null };
}

export async function getProfile(
  client: AppSupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await client
    .from("profiles")
    .select("id, display_name, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle()
    .returns<Profile>();
  if (error || !data) return null;
  return data;
}

// Enforces the first-sign-in profile row exists (RLS INSERT WITH CHECK is keyed
// to auth.uid(), so a signed-in caller may only create their own row).
export async function ensureProfile(
  client: AppSupabaseClient,
  user: User,
): Promise<Profile | null> {
  const existing = await getProfile(client, user.id);
  if (existing) return existing;
  const { data, error } = await client
    .from("profiles")
    .insert({ id: user.id })
    .select("id, display_name, created_at, updated_at")
    .single()
    .returns<Profile>();
  if (error || !data) return null;
  return data;
}

export async function updateDisplayName(
  client: AppSupabaseClient,
  input: { userId: string; displayName: string },
): Promise<{ error: string | null }> {
  const displayName = input.displayName.trim();
  if (displayName.length > DISPLAY_NAME_MAX) {
    return {
      error: `Display names are limited to ${DISPLAY_NAME_MAX} characters.`,
    };
  }
  const { error } = await client
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", input.userId);
  if (error) return { error: genericError(GENERIC_SYNC_MESSAGE) };
  return { error: null };
}

export { asMessage };