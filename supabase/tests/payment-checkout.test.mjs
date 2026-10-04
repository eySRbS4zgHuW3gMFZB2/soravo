// T32-B — unit tests for the payment checkout Edge Function logic.
//
// These tests execute the real handler (`checkout.ts`, runtime-agnostic) with
// a mocked `fetch` and explicit env — no network, no Razorpay API mutation,
// no Dashboard objects, no secrets. Every test maps to the documented
// contract (Soravo v6 §06 checkout endpoint + §15 TEST-only secrets).
//
// What is asserted:
//   * Authentication is established ONLY through the Supabase Auth API
//     (`GET /auth/v1/user`); decoded JWT claims alone never authenticate.
//   * Product/price/currency resolve server-side from `@soravo/payment-domain`
//     (imported as the price authority — expected amounts are read from the
//     catalog, never hardcoded); client amount/user_id fields are ignored.
//   * Only TEST-mode keys are accepted; monthly Plan IDs come from env and
//     are never fabricated; failures never leak secrets.

import { describe, expect, it } from "vitest";
import { PRODUCT_CATALOG } from "@soravo/payment-domain";

import {
  AuthVerificationError,
  createCheckoutHandler,
  encodeBase64Ascii,
  isTestModeKeyId,
  parseJWTClaims,
  readCheckoutEnv,
  resolveMonthlyPlanId,
  verifyAuthToken,
} from "../functions/payment-checkout/checkout.ts";

const USER_ID = "12345678-1234-1234-1234-123456789012";
const OTHER_USER_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const SUPABASE_URL = "https://example.supabase.co";
const ANON_KEY = "test-anon-key-fixture";
const TEST_KEY_ID = "rzp_test_fixturekeyid";
const TEST_KEY_SECRET = "fixture-secret-never-real";
const PLAN_FIXTURE_USD = "plan_fixture_monthly_usd";

function makeToken(sub, exp) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ sub, exp, role: "authenticated" }));
  return `${header}.${payload}.fixture-signature`;
}

const VALID_TOKEN = () => makeToken(USER_ID, 2_000_000_000);
const EXPIRED_TOKEN = () => makeToken(USER_ID, 1_000_000_000);

function makeEnv(overrides = {}) {
  return {
    razorpayKeyId: TEST_KEY_ID,
    razorpayKeySecret: TEST_KEY_SECRET,
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: ANON_KEY,
    monthlyPlanIds: { USD: PLAN_FIXTURE_USD },
    ...overrides,
  };
}

function mockFetch(options = {}) {
  const {
    authUserId = USER_ID,
    authStatus = 200,
    authThrows = false,
    orderId = "order_fixture_001",
    subscriptionId = "sub_fixture_001",
    razorpayStatus = 200,
  } = options;
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith("/auth/v1/user")) {
      if (authThrows) throw new Error("network down (fixture)");
      if (authStatus !== 200) {
        return new Response(JSON.stringify({ msg: "invalid token" }), {
          status: authStatus,
        });
      }
      return Response.json({ id: authUserId });
    }
    if (url.includes("api.razorpay.com/v1/orders")) {
      if (razorpayStatus !== 200) {
        return new Response("provider error (fixture)", {
          status: razorpayStatus,
        });
      }
      return Response.json({ id: orderId });
    }
    if (url.includes("api.razorpay.com/v1/subscriptions")) {
      if (razorpayStatus !== 200) {
        return new Response("provider error (fixture)", {
          status: razorpayStatus,
        });
      }
      return Response.json({ id: subscriptionId });
    }
    throw new Error(`unexpected fetch in test: ${url}`);
  };
  return { fn, calls };
}

function postRequest(body, token) {
  const headers = {
    "Content-Type": "application/json",
  };
  if (token !== undefined) {
    headers["Authorization"] = token ? `Bearer ${token}` : "";
  }
  return new Request("https://example.supabase.co/functions/v1/payment-checkout", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function readJson(response) {
  return { status: response.status, body: (await response.json()) };
}

describe("Payment Checkout Endpoint (T32-B)", () => {
  describe("Authentication", () => {
    it("rejects a missing Authorization header with 401", async () => {
      const { fn } = mockFetch();
      const handler = createCheckoutHandler(makeEnv(), { fetchFn: fn });
      const req = new Request("https://x.test/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "soravo_lifetime", currency: "USD" }),
      });
      const { status, body } = await readJson(await handler(req));
      expect(status).toBe(401);
      expect(body["code"]).toBe("unauthenticated");
    });

    it("rejects a structurally malformed JWT with 401", async () => {
      const { fn, calls } = mockFetch();
      const handler = createCheckoutHandler(makeEnv(), { fetchFn: fn });
      const { status, body } = await readJson(
        await handler(postRequest({ productId: "soravo_lifetime", currency: "USD" }, "not.a.jwt.at.all.extra")),
      );
      expect(status).toBe(401);
      expect(body["code"]).toBe("unauthenticated");
      expect(calls.length).toBe(0);
    });

    it("rejects an expired JWT with 401 without calling the Auth API", async () => {
      const { fn, calls } = mockFetch();
      const handler = createCheckoutHandler(makeEnv(), { fetchFn: fn });
      const { status, body } = await readJson(
        await handler(postRequest({ productId: "soravo_lifetime", currency: "USD" }, EXPIRED_TOKEN())),
      );
      expect(status).toBe(401);
      expect(body["code"]).toBe("unauthenticated");
      expect(calls.length).toBe(0);
    });

    it("rejects a well-formed JWT the Auth API does not confirm (401)", async () => {
      const { fn } = mockFetch({ authStatus: 401 });
      const handler = createCheckoutHandler(makeEnv(), { fetchFn: fn });
      const { status, body } = await readJson(
        await handler(postRequest({ productId: "soravo_lifetime", currency: "USD" }, VALID_TOKEN())),
      );
      expect(status).toBe(401);
      expect(body["code"]).toBe("unauthenticated");
    });

    it("rejects when the Auth API confirms a different user than the decoded sub", async () => {
      const { fn } = mockFetch({ authUserId: OTHER_USER_ID });
      const handler = createCheckoutHandler(makeEnv(), { fetchFn: fn });
      const { status, body } = await readJson(
        await handler(postRequest({ productId: "soravo_lifetime", currency: "USD" }, VALID_TOKEN())),
      );
      expect(status).toBe(401);
      expect(body["code"]).toBe("unauthenticated");
    });

    it("fails closed with 500 (not 401) when the Auth API is unreachable", async () => {
      const { fn } = mockFetch({ authThrows: true });
      const handler = createCheckoutHandler(makeEnv(), { fetchFn: fn });
      const { status, body } = await readJson(
        await handler(postRequest({ productId: "soravo_lifetime", currency: "USD" }, VALID_TOKEN())),
      );
      expect(status).toBe(500);
      expect(body["code"]).toBe("auth_unavailable");
    });

    it("verifyAuthToken returns the confirmed id, null on rejection, throws when unreachable", async () => {
      const env = makeEnv();
      const ok = mockFetch({ authUserId: USER_ID });
      await expect(verifyAuthToken(VALID_TOKEN(), env, ok.fn)).resolves.toBe(USER_ID);
      const rejected = mockFetch({ authStatus: 401 });
      await expect(verifyAuthToken(VALID_TOKEN(), env, rejected.fn)).resolves.toBeNull();
      const down = mockFetch({ authThrows: true });
      await expect(verifyAuthToken(VALID_TOKEN(), env, down.fn)).rejects.toBeInstanceOf(
        AuthVerificationError,
      );
    });
  });

  describe("Request validation", () => {
    it("rejects invalid JSON with 400", async () => {
      const { fn } = mockFetch();
      const handler = createCheckoutHandler(makeEnv(), { fetchFn: fn });
      const { status, body } = await readJson(await handler(postRequest("{oops", VALID_TOKEN())));
      expect(status).toBe(400);
      expect(body["code"]).toBe("malformed_request");
    });

    it("rejects a missing productId with 400", async () => {
      const { fn } = mockFetch();
      const handler = createCheckoutHandler(makeEnv(), { fetchFn: fn });
      const { status } = await readJson(
        await handler(postRequest({ currency: "USD" }, VALID_TOKEN())),
      );
      expect(status).toBe(400);
    });

    it("rejects a missing currency with 400", async () => {
      const { fn } = mockFetch();
      const handler = createCheckoutHandler(makeEnv(), { fetchFn: fn });
      const { status } = await readJson(
        await handler(postRequest({ productId: "soravo_lifetime" }, VALID_TOKEN())),
      );
      expect(status).toBe(400);
    });

    it("rejects an unknown product with 400 invalid_product", async () => {
      const { fn } = mockFetch();
      const handler = createCheckoutHandler(makeEnv(), { fetchFn: fn });
      const { status, body } = await readJson(
        await handler(postRequest({ productId: "soravo_weekly", currency: "USD" }, VALID_TOKEN())),
      );
      expect(status).toBe(400);
      expect(body["code"]).toBe("invalid_product");
    });

    it("rejects an unsupported currency with 400 invalid_product", async () => {
      const { fn } = mockFetch();
      const handler = createCheckoutHandler(makeEnv(), { fetchFn: fn });
      const { status, body } = await readJson(
        await handler(postRequest({ productId: "soravo_lifetime", currency: "XXX" }, VALID_TOKEN())),
      );
      expect(status).toBe(400);
      expect(body["code"]).toBe("invalid_product");
    });

    it("answers 405 for non-POST and 204 for CORS preflight", async () => {
      const { fn } = mockFetch();
      const handler = createCheckoutHandler(makeEnv(), { fetchFn: fn });
      const get = await handler(new Request("https://x.test/", { method: "GET" }));
      expect(get.status).toBe(405);
      const preflight = await handler(new Request("https://x.test/", { method: "OPTIONS" }));
      expect(preflight.status).toBe(204);
    });
  });

  describe("Server-authoritative pricing", () => {
    it("ignores client amount/user_id: charges the catalog price for the Auth identity", async () => {
      const { fn, calls } = mockFetch();
      const handler = createCheckoutHandler(makeEnv(), { fetchFn: fn });
      const expected = PRODUCT_CATALOG["soravo_lifetime"].regionalPrices["USD"];
      const { status, body } = await readJson(
        await handler(
          postRequest(
            {
              productId: "soravo_lifetime",
              currency: "USD",
              amount: 1,
              amountMinor: 1,
              user_id: OTHER_USER_ID,
              userId: OTHER_USER_ID,
            },
            VALID_TOKEN(),
          ),
        ),
      );
      expect(status).toBe(200);
      expect(body["amount"]).toBe(expected.amountMinor);
      expect(body["productId"]).toBe("soravo_lifetime");
      const orderCall = calls.find((c) => c.url.includes("api.razorpay.com/v1/orders"));
      expect(orderCall).toBeDefined();
      const sent = JSON.parse(orderCall.init.body);
      expect(sent.amount).toBe(expected.amountMinor);
      expect(sent.currency).toBe("USD");
      expect(sent.notes.user_id).toBe(USER_ID);
      expect(sent.notes.product_id).toBe("soravo_lifetime");
    });

    it("lifetime returns orderId + catalog amount; monthly returns subscriptionId without amount", async () => {
      const { fn } = mockFetch();
      const handler = createCheckoutHandler(makeEnv(), { fetchFn: fn });
      const lifetime = await readJson(
        await handler(postRequest({ productId: "soravo_lifetime", currency: "USD" }, VALID_TOKEN())),
      );
      expect(lifetime.status).toBe(200);
      expect(typeof lifetime.body["orderId"]).toBe("string");
      expect(lifetime.body["subscriptionId"]).toBeUndefined();
      expect(lifetime.body["keyId"]).toBe(TEST_KEY_ID);

      const monthly = await readJson(
        await handler(postRequest({ productId: "soravo_monthly", currency: "USD" }, VALID_TOKEN())),
      );
      expect(monthly.status).toBe(200);
      expect(typeof monthly.body["subscriptionId"]).toBe("string");
      expect(monthly.body["orderId"]).toBeUndefined();
      expect(monthly.body["amount"]).toBeUndefined();
      expect(monthly.body["keyId"]).toBe(TEST_KEY_ID);
    });

    it("sends the configured monthly Plan ID verbatim — never a fabricated one", async () => {
      const { fn, calls } = mockFetch();
      const handler = createCheckoutHandler(makeEnv(), { fetchFn: fn });
      const { status } = await readJson(
        await handler(postRequest({ productId: "soravo_monthly", currency: "USD" }, VALID_TOKEN())),
      );
      expect(status).toBe(200);
      const subCall = calls.find((c) => c.url.includes("api.razorpay.com/v1/subscriptions"));
      expect(subCall).toBeDefined();
      const sent = JSON.parse(subCall.init.body);
      expect(sent.plan_id).toBe(PLAN_FIXTURE_USD);
    });

    it("fails closed with 503 when no monthly Plan ID is configured (no fabrication)", async () => {
      const { fn, calls } = mockFetch();
      const handler = createCheckoutHandler(makeEnv({ monthlyPlanIds: {} }), { fetchFn: fn });
      const { status, body } = await readJson(
        await handler(postRequest({ productId: "soravo_monthly", currency: "USD" }, VALID_TOKEN())),
      );
      expect(status).toBe(503);
      expect(body["code"]).toBe("plan_not_configured");
      expect(calls.some((c) => c.url.includes("api.razorpay.com"))).toBe(false);
    });

    it("never exposes server secrets in any response", async () => {
      const { fn } = mockFetch();
      const handler = createCheckoutHandler(makeEnv(), { fetchFn: fn });
      for (const payload of [
        { productId: "soravo_lifetime", currency: "USD" },
        { productId: "soravo_monthly", currency: "USD" },
        { productId: "nope", currency: "USD" },
      ]) {
        const res = await handler(postRequest(payload, VALID_TOKEN()));
        const text = await res.text();
        expect(text).not.toContain(TEST_KEY_SECRET);
        expect(text).not.toContain(ANON_KEY);
      }
      const providerFailure = mockFetch({ razorpayStatus: 500 });
      const failing = createCheckoutHandler(makeEnv(), { fetchFn: providerFailure.fn });
      const res = await failing(postRequest({ productId: "soravo_lifetime", currency: "USD" }, VALID_TOKEN()));
      expect(res.status).toBe(500);
      const { body } = await readJson(res);
      expect(body["code"]).toBe("provider_failure");
      expect(JSON.stringify(body)).not.toContain(TEST_KEY_SECRET);
    });
  });

  describe("TEST-mode enforcement", () => {
    it("accepts rzp_test_ keys and rejects missing credentials at env read", () => {
      expect(isTestModeKeyId("rzp_test_fixture")).toBe(true);
      expect(isTestModeKeyId("rzp_live_anything")).toBe(false);
      expect(isTestModeKeyId("")).toBe(false);
      const get = (vars) => (name) => vars[name];
      const full = {
        RAZORPAY_KEY_ID: TEST_KEY_ID,
        RAZORPAY_KEY_SECRET: TEST_KEY_SECRET,
        SUPABASE_URL,
        SUPABASE_ANON_KEY: ANON_KEY,
      };
      expect(readCheckoutEnv(get(full))).not.toBeNull();
      expect(readCheckoutEnv(get({ ...full, RAZORPAY_KEY_ID: "rzp_live_denied" }))).toBeNull();
      expect(readCheckoutEnv(get({ ...full, RAZORPAY_KEY_SECRET: "" }))).toBeNull();
      expect(
        resolveMonthlyPlanId(makeEnv({ monthlyPlanIds: { USD: PLAN_FIXTURE_USD } }), "USD"),
      ).toBe(PLAN_FIXTURE_USD);
      expect(resolveMonthlyPlanId(makeEnv({ monthlyPlanIds: {} }), "USD")).toBeNull();
    });

    it("answers 500 not_configured without calling any provider when env is absent", async () => {
      const { fn, calls } = mockFetch();
      const handler = createCheckoutHandler(null, { fetchFn: fn });
      const { status, body } = await readJson(
        await handler(postRequest({ productId: "soravo_lifetime", currency: "USD" }, VALID_TOKEN())),
      );
      expect(status).toBe(500);
      expect(body["code"]).toBe("not_configured");
      expect(calls.length).toBe(0);
    });
  });

  describe("Structural helpers", () => {
    it("parseJWTClaims extracts shape/expiry and rejects malformed tokens", () => {
      expect(parseJWTClaims(VALID_TOKEN())).toEqual({ sub: USER_ID, exp: 2_000_000_000 });
      expect(parseJWTClaims("a.b")).toBeNull();
      expect(parseJWTClaims("...")).toBeNull();
      expect(parseJWTClaims("x.y.z")).toBeNull();
    });

    it("encodeBase64Ascii matches Basic-auth encoding for ASCII credentials", () => {
      expect(encodeBase64Ascii(`${TEST_KEY_ID}:${TEST_KEY_SECRET}`)).toBe(
        Buffer.from(`${TEST_KEY_ID}:${TEST_KEY_SECRET}`).toString("base64"),
      );
    });
  });
});
