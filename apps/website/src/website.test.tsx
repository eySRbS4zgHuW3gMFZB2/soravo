import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AppRoutes } from "./app";

afterEach(cleanup);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  );
}

describe("website shell", () => {
  it("renders the landing page privacy promise", () => {
    renderAt("/");
    expect(screen.getByText(/stay on your device/i)).toBeTruthy();
  });

  it("renders dedicated core content pages", () => {
    renderAt("/privacy");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("words are not");
  });

  it("shows the not-found page for unknown routes", () => {
    renderAt("/does-not-exist");
    expect(screen.getByText(/this page does not exist/i)).toBeTruthy();
  });
});