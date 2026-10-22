/**
 * __tests__/rateLimit.test.ts
 * Tests for the in-memory rate limiter.
 */

import { rateLimit } from "@/lib/rateLimit";

describe("rateLimit", () => {
  it("allows requests within the limit", () => {
    const key = `test-allow-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5, 60_000).allowed).toBe(true);
    }
  });

  it("blocks requests exceeding the limit", () => {
    const key = `test-block-${Date.now()}`;
    for (let i = 0; i < 5; i++) rateLimit(key, 5, 60_000);
    expect(rateLimit(key, 5, 60_000).allowed).toBe(false);
  });

  it("reports correct remaining count", () => {
    const key = `test-remaining-${Date.now()}`;
    const r1 = rateLimit(key, 3, 60_000);
    expect(r1.remaining).toBe(2);
    const r2 = rateLimit(key, 3, 60_000);
    expect(r2.remaining).toBe(1);
    const r3 = rateLimit(key, 3, 60_000);
    expect(r3.remaining).toBe(0);
  });

  it("resets after the window expires", async () => {
    const key = `test-reset-${Date.now()}`;
    // Use a 50ms window
    rateLimit(key, 1, 50);
    rateLimit(key, 1, 50); // exceed
    await new Promise((r) => setTimeout(r, 80)); // wait for window to expire
    expect(rateLimit(key, 1, 50).allowed).toBe(true);
  });

  it("different keys are tracked independently", () => {
    const k1 = `test-k1-${Date.now()}`;
    const k2 = `test-k2-${Date.now()}`;
    rateLimit(k1, 1, 60_000);
    rateLimit(k1, 1, 60_000); // k1 is over limit
    expect(rateLimit(k2, 1, 60_000).allowed).toBe(true); // k2 is fresh
  });
});
