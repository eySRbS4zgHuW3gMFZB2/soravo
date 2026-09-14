import { invoke } from "@tauri-apps/api/core";

export type RuntimeStatus = { version: string; state: "idle"; localOnly: true };

export async function getRuntimeStatus(): Promise<RuntimeStatus> {
  return invoke<RuntimeStatus>("runtime_status");
}
