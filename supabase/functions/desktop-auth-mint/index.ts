// Desktop-auth mint Edge Function — Deno wiring only (env read + serve).
//
// Security model:
//   * Platform JWT gate (`verify_jwt = true` in `supabase/config.toml`)
//     verifies the Auth JWT before the handler runs.
//   * Defense-in-depth: the handler re-confirms the token against the
//     authoritative Auth API (`GET /auth/v1/user`); the confirmed user id is
//     the mint identity. Manually decoded claims are never authentication.
//   * Only the code SHA-256 is persisted; the code itself is returned once.
//   * Missing configuration fails closed with 503.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { MintError, mintCode, validateMintBody, webSha256Hex } from "./mint.ts";

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
  if (!config) return respond(503, "desktop auth mint is not configured");
  if (req.method !== "POST") return respond(405, "method not allowed");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return respond(400, "malformed request");
  }
  let mintReq;
  try {
    mintReq = validateMintBody(body);
  } catch (e) {
    return respond((e as MintError).status ?? 400, "malformed request");
  }
  const authHeader = req.headers.get("authorization") ?? "";
  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "soravo-desktop-auth-mint" } },
  });
  const { data, error } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
  if (error || !data.user) return respond(401, "unauthorized");
  const grant = await mintCode(data.user.id, mintReq, {
    randomBytes: (n: number) => crypto.getRandomValues(new Uint8Array(n)),
    sha256Hex: webSha256Hex,
  });
  const { error: insertError } = await supabase.from("desktop_auth_codes").insert({
    user_id: grant.userId,
    code_hash: grant.codeHash,
    code_challenge: grant.codeChallenge,
    state: grant.state,
  });
  if (insertError) return respond(500, "could not issue code");
  return json(200, { code: grant.code, expires_in: grant.expiresIn });
});
