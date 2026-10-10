// Desktop-auth exchange Edge Function — Deno wiring only.
//
// Security model:
//   * `verify_jwt = false` in `supabase/config.toml` (declared explicitly):
//     possession of the single-use code + PKCE verifier IS the credential.
//     No user JWT exists yet at this point by construction.
//   * The code row is consumed atomically (`consumed_at IS NULL`
//     compare-and-swap) before any session is minted; a lost race answers
//     with the same generic error as an invalid code.
//   * The session is minted server-side via the Admin API (generateLink
//     magiclink -> /verify) with the service-role key; the token_hash never
//     leaves this function except in the platform-internal verify call.
//   * Missing configuration fails closed with 503.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  authorizeExchange,
  ExchangeError,
  extractTokenHash,
  validateExchangeBody,
  webSha256Bytes,
  webSha256Hex,
} from "./exchange.ts";

export { webSha256Bytes, webSha256Hex };

type Config = {
  supabaseUrl: string;
  serviceRoleKey: string;
};

function readConfig(): Config | null {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) return null;
  return { supabaseUrl, serviceRoleKey };
}

const config = readConfig();

function respond(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

function json(status: number, value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (!config) return respond(503, "desktop auth exchange is not configured");
  if (req.method !== "POST") return respond(405, "method not allowed");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return respond(400, "invalid or expired code");
  }
  let exchangeReq;
  try {
    exchangeReq = validateExchangeBody(body);
  } catch (e) {
    return respond((e as ExchangeError).status ?? 400, "invalid or expired code");
  }
  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "soravo-desktop-auth-exchange" } },
  });
  let userId: string;
  try {
    const authorized = await authorizeExchange(exchangeReq, {
      sha256Hex: webSha256Hex,
      sha256Bytes: webSha256Bytes,
      readUnexpiredUnconsumed: async (codeHash: string) => {
        const { data, error } = await supabase
          .from("desktop_auth_codes")
          .select("user_id, code_challenge, state")
          .eq("code_hash", codeHash)
          .is("consumed_at", null)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();
        if (error || !data) return null;
        return {
          user_id: (data as { user_id: string }).user_id,
          code_challenge: (data as { code_challenge: string }).code_challenge,
          state: (data as { state: string }).state,
        };
      },
      consume: async (codeHash: string) => {
        const { data, error } = await supabase
          .from("desktop_auth_codes")
          .update({ consumed_at: new Date().toISOString() })
          .eq("code_hash", codeHash)
          .is("consumed_at", null)
          .select("id");
        if (error || !data || (data as unknown[]).length === 0) return false;
        return true;
      },
    });
    userId = authorized.userId;
  } catch (e) {
    return respond((e as ExchangeError).status ?? 400, "invalid or expired code");
  }
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
  const email = userData?.user?.email;
  if (userError || !email) return respond(500, "could not establish session");
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const actionLink = (
    linkData as { properties?: { action_link?: string } } | null
  )?.properties?.action_link;
  const tokenHash = actionLink ? extractTokenHash(actionLink) : null;
  if (linkError || !tokenHash) return respond(500, "could not establish session");
  const verifyRes = await fetch(`${config.supabaseUrl}/auth/v1/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.serviceRoleKey,
    },
    body: JSON.stringify({ token_hash: tokenHash, type: "magiclink" }),
  });
  if (!verifyRes.ok) return respond(500, "could not establish session");
  const session = (await verifyRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    user?: { id?: string };
  };
  if (!session.access_token || !session.refresh_token || session.user?.id !== userId) {
    return respond(500, "could not establish session");
  }
  return json(200, {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in ?? 3600,
    user: { id: userId },
  });
});
