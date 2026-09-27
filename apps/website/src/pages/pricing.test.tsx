import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router";
import { createMockSupabaseClient } from "../test-utils/supabase-mock";
import { AuthProvider } from "../lib/auth-context";
import { Pricing } from "./pricing";

function createWrapper(client: ReturnType<typeof createMockSupabaseClient>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={["/pricing"]}>
        <AuthProvider client={client}>{children}</AuthProvider>
      </MemoryRouter>
    );
  };
}

describe("Pricing page", () => {
  let originalRazorpay: typeof window.Razorpay;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalRazorpay = window.Razorpay;
    originalFetch = globalThis.fetch;
    (window as any).Razorpay = { open: vi.fn() };
  });

  afterEach(() => {
    window.Razorpay = originalRazorpay;
    globalThis.fetch = originalFetch;
  });

  it("renders both plans", () => {
    const client = createMockSupabaseClient({
      session: { user: { id: "user-1" } },
    });
    render(<Pricing />, { wrapper: createWrapper(client) });

    expect(screen.getByText("Monthly")).toBeInTheDocument();
    expect(screen.getByText("One-time")).toBeInTheDocument();
  });

  it("calls payment-checkout when authenticated", async () => {
    const client = createMockSupabaseClient({
      session: { user: { id: "user-1" } },
    });

    const mockResponse = {
      orderId: "order_abc123",
      keyId: "rzp_test_xxx",
      amount: 41500,
      currency: "INR",
      productId: "soravo_lifetime",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    render(<Pricing />, { wrapper: createWrapper(client) });

    const purchaseButtons = screen.getAllByRole("button", { name: /purchase/i });
    await act(async () => {
      fireEvent.click(purchaseButtons[1]);
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    expect((window as any).Razorpay.open).toHaveBeenCalled();
  });

  it("shows Razorpay checkout for lifetime purchase", async () => {
    const client = createMockSupabaseClient({
      session: { user: { id: "user-1" } },
    });

    const mockResponse = {
      orderId: "order_abc123",
      keyId: "rzp_test_xxx",
      amount: 41500,
      currency: "INR",
      productId: "soravo_lifetime",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    render(<Pricing />, { wrapper: createWrapper(client) });

    const purchaseButtons = screen.getAllByRole("button", { name: /purchase/i });
    await act(async () => {
      fireEvent.click(purchaseButtons[1]);
    });

    await waitFor(() => {
      expect((window as any).Razorpay.open).toHaveBeenCalledWith(
        expect.objectContaining({
          order_id: "order_abc123",
          amount: 41500,
          currency: "INR",
        }),
      );
    });
  });

  it("handles server error gracefully", async () => {
    const client = createMockSupabaseClient({
      session: { user: { id: "user-1" } },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: "Invalid product",
        code: "invalid_product",
      }),
    });

    render(<Pricing />, { wrapper: createWrapper(client) });

    const purchaseButtons = screen.getAllByRole("button", { name: /purchase/i });
    await act(async () => {
      fireEvent.click(purchaseButtons[1]);
    });

    await waitFor(() => {
      expect(screen.getByText("Invalid product")).toBeInTheDocument();
    });
  });

  it("disables buttons during checkout", async () => {
    const client = createMockSupabaseClient({
      session: { user: { id: "user-1" } },
    });

    let resolveFetch: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });

    globalThis.fetch = vi.fn().mockReturnValue(fetchPromise);

    render(<Pricing />, { wrapper: createWrapper(client) });

    const purchaseButtons = screen.getAllByRole("button", { name: /purchase/i });
    await act(async () => {
      fireEvent.click(purchaseButtons[1]);
    });

    expect(purchaseButtons[1]).toBeDisabled();

    resolveFetch!(
      new Response(
        JSON.stringify({
          orderId: "order_abc123",
          keyId: "rzp_test_xxx",
          amount: 41500,
          currency: "INR",
          productId: "soravo_lifetime",
        }),
        { status: 200 },
      ),
    );

    await waitFor(() => {
      expect((window as any).Razorpay.open).toHaveBeenCalled();
    });
  });
});
