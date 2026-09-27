import { vi } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import { expect } from "vitest";

expect.extend(matchers);

vi.stubGlobal("scrollTo", vi.fn());