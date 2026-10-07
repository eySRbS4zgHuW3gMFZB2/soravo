//! R1-GAP-004 regression tests: macOS permission-declaration posture.
//!
//! What is pinned here and why:
//! - `src-tauri/Info.plist` must exist and declare
//!   `NSMicrophoneUsageDescription` with a non-empty string. macOS denies
//!   microphone access without the usage key (TCC), and the desktop cannot
//!   satisfy R1-GAP-007 (mic capture) on macOS without it. The Tauri CLI
//!   auto-merges `src-tauri/Info.plist` into the macOS bundle plist on
//!   macOS builds (`tauri-cli/src/interface/rust.rs`, `tauri_dir.join(
//!   "Info.plist")`), on top of any explicit `bundle.macOS.infoPlist`
//!   config — no `tauri.conf.json` change is needed for this file to take
//!   effect. Content is reused verbatim from the Handy pin of record
//!   (`cjpais/Handy @ ba10ce19`, SHA-256 recorded in
//!   `R1-GAP-004-PERMISSION-CAPABILITY-CHECKLIST.md`).
//! - `src-tauri/Entitlements.plist` pins the non-sandboxed posture
//!   (`com.apple.security.app-sandbox = false`). Device microphone
//!   entitlements are a sandboxed-app requirement; with the sandbox off,
//!   the usage description above is the operative declaration. Flipping
//!   the sandbox on REQUIRES adding the device microphone/audio-input
//!   entitlements and reviewing this test — the failure message says so.
//!
//! std-only on purpose: no new dependency for a static-file guard
//! (adding one would be an HR-D admission under ADR-031 §5.6).

use std::path::PathBuf;

fn src_tauri_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn read_plist(name: &str) -> String {
    let path = src_tauri_dir().join(name);
    std::fs::read_to_string(&path)
        .unwrap_or_else(|e| panic!("R1-GAP-004: {name} must exist and be readable ({e})"))
}

fn tag_content(plist: &str, key: &str) -> Option<String> {
    let open_key = format!("<key>{key}</key>");
    let key_pos = plist.find(&open_key)?;
    let after_key = &plist[key_pos + open_key.len()..];
    let string_open = "<string>";
    let string_pos = after_key.find(string_open)?;
    let after_open = &after_key[string_pos + string_open.len()..];
    let end_pos = after_open.find("</string>")?;
    Some(after_open[..end_pos].to_string())
}

#[test]
fn info_plist_declares_microphone_usage() {
    let plist = read_plist("Info.plist");

    assert!(
        plist.contains("<plist version=\"1.0\">") && plist.contains("</plist>"),
        "R1-GAP-004: Info.plist must remain a well-formed plist document"
    );

    let description = tag_content(&plist, "NSMicrophoneUsageDescription");
    assert!(
        description.as_deref().is_some_and(|s| !s.trim().is_empty()),
        "R1-GAP-004: Info.plist must declare NSMicrophoneUsageDescription \
         with a non-empty string, otherwise macOS denies microphone access \
         (R1-GAP-007) at the TCC prompt"
    );
}

#[test]
fn entitlements_posture_stays_non_sandboxed() {
    let plist = read_plist("Entitlements.plist");

    assert!(
        plist.contains("<key>com.apple.security.app-sandbox</key>"),
        "R1-GAP-004: Entitlements.plist must keep an explicit app-sandbox key \
         so the sandboxed/non-sandboxed posture is always a conscious choice"
    );

    // The key must be followed by <false/> (not <true/>). A bare substring
    // search would also match inside comments, so anchor on the key first.
    let key_pos = plist
        .find("<key>com.apple.security.app-sandbox</key>")
        .expect("key presence asserted above");
    let after_key = &plist[key_pos..];
    let false_pos = after_key.find("<false/>");
    let true_pos = after_key.find("<true/>");
    assert!(
        false_pos.is_some() && false_pos < true_pos,
        "R1-GAP-004: app-sandbox must stay <false/>. Flipping it to <true/> \
         makes the app sandboxed, which REQUIRES adding \
         com.apple.security.device.microphone (+ audio-input) entitlements \
         and a conscious review of this test"
    );
}
