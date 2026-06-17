import { vi } from "vitest";

vi.mock("next/font/google", () => ({
  Inter: () => ({ className: "mock-inter", variable: "--font-body" }),
  JetBrains_Mono: () => ({ className: "mock-mono", variable: "--font-mono" }),
  Playfair_Display: () => ({ className: "mock-display", variable: "--font-display" }),
}));
