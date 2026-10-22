/**
 * __tests__/session.test.ts
 * Tests for JWT signing and verification.
 * Does NOT test cookie I/O (requires Next.js runtime).
 */

import { signToken, verifyToken } from "@/lib/session";

// Provide a test secret
process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-hs256-algorithm";

describe("signToken / verifyToken", () => {
  it("signs a payload and verifies it correctly", async () => {
    const payload = {
      userId: "abc123",
      role: "employee" as const,
      isActive: true,
    };
    const token = await signToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT has 3 parts

    const verified = await verifyToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe("abc123");
    expect(verified?.role).toBe("employee");
    expect(verified?.isActive).toBe(true);
  });

  it("returns null for a tampered token", async () => {
    const payload = {
      userId: "abc123",
      role: "admin" as const,
      isActive: true,
    };
    const token = await signToken(payload);
    const parts = token.split(".");
    // Tamper with payload section
    parts[1] = Buffer.from(
      JSON.stringify({ userId: "hacked", role: "admin", isActive: true }),
    ).toString("base64url");
    const tampered = parts.join(".");
    const result = await verifyToken(tampered);
    expect(result).toBeNull();
  });

  it("returns null for a completely invalid string", async () => {
    expect(await verifyToken("not.a.jwt")).toBeNull();
    expect(await verifyToken("")).toBeNull();
    expect(await verifyToken("invalid")).toBeNull();
  });

  it("includes an expiry (exp) in the token", async () => {
    const token = await signToken({
      userId: "u1",
      role: "hr" as const,
      isActive: true,
    });
    const verified = await verifyToken(token);
    expect(verified?.exp).toBeDefined();
    expect(verified!.exp!).toBeGreaterThan(Date.now() / 1000);
  });
});
