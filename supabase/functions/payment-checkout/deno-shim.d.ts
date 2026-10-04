// Minimal Deno ambient for Node-based typechecking of the Edge Function.
// The real Deno runtime provides these; this shim exists ONLY so
// `tsc --noEmit` (T16 F-09 coverage) can check `index.ts` without a Deno
// toolchain. It must stay a strict subset of the Deno APIs used here.
declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};
