// Prevents additional console window on Windows in release, DO NOT REMOVE!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// NOTE: Upstream Handy sets WEBKIT_DISABLE_DMABUF_RENDERER=1 on Linux to avoid
// GPU/display-server WebKit crashes (tauri#9394). That is an `unsafe` env
// mutation in edition 2024 and the Soravo workspace forbids unsafe code, so
// the workaround is intentionally NOT ported. If Linux WebKit rendering
// regresses, revisit via ADR review rather than introducing unsafe.

fn main() {
    soravo_desktop_lib::run()
}
