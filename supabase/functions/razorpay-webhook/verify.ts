// HMAC-SHA256 verification of the Razorpay webhook signature (021 finding F10).
//
// Razorpay signs the RAW request body with the webhook secret configured in the
// dashboard; the signature arrives in the `x-razorpay-signature` header. We
// recompute it with Web Crypto and let `crypto.subtle.verify` perform the
// comparison (constant-time by construction) instead of a hand-rolled
// `charCodeAt` loop over a digest string.

const encoder = new TextEncoder();

export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | undefined {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    return undefined;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function verifyRazorpaySignature(
  secret: string,
  rawBody: string,
  signature: string,
): Promise<boolean> {
  if (!secret || !signature) return false;
  const provided = hexToBytes(signature);
  if (!provided) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
    return await crypto.subtle.verify(
      { name: "HMAC" },
      key,
      provided,
      encoder.encode(rawBody),
    );
  } catch {
    return false;
  }
}
