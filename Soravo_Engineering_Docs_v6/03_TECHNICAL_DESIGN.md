# 03 — Technical Design
Architecture:
Website (React/TS/shadcn) → Supabase Auth/JWT → `payment-checkout` Edge Function → Razorpay.
Razorpay → `razorpay-webhook` Edge Function → webhook ledger → Supabase entitlements → account/desktop.
Desktop: Tauri → Soravo contracts → Handy-derived implementation → audio/VAD/STT/model/typing.

Desktop-owned Soravo contracts:
- session state machine;
- transcript semantics;
- typed IPC/events;
- security;
- auth/account;
- entitlement/offline policy;
- model provenance/licensing;
- product/release policy.

Handy-derived/adapted:
audio toolkit, VAD, hotkeys, clipboard/input, settings, tray, overlay, model management, transcription infrastructure, history and platform plumbing.

Session: IDLE → STARTING → LISTENING → TRANSCRIBING → FINALIZING → DONE → IDLE; any state may enter ERROR → IDLE. Every async result carries session identity and ordering metadata.

Audio: callback → bounded buffer → timestamped frames → worker → VAD/chunking → STT → stabilization → committed/final → typing.

Model lifecycle: DISCOVERED → DOWNLOADING → VERIFYING → INSTALLING → AVAILABLE → LOADED; failure preserves prior working model.

Payment catalog source of truth: `packages/payment-domain`. Current research values: monthly INR 9900, USD 1200, CAD 1600, EUR 1100, AUD 1800 minor units; lifetime INR 41500, USD 5000, CAD 6700, EUR 4600, AUD 7500. These are implementation values, not permanent business decisions.

Lifetime = Razorpay Order. Monthly = Razorpay Plan + Subscription. Browser receives only public key ID and provider transaction identifiers.
