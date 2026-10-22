/**
 * __tests__/password.test.ts
 * Tests for password hashing, verification, strength validation, and token generation.
 */

import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateResetToken,
  hashResetToken,
} from "@/lib/password";
import { createHash } from "crypto";

describe("hashPassword / verifyPassword", () => {
  it("hashes a password and verifies it correctly", async () => {
    const hash = await hashPassword("SecurePass1");
    expect(hash).not.toBe("SecurePass1");
    expect(hash.startsWith("$2")).toBe(true); // bcrypt prefix
    await expect(verifyPassword("SecurePass1", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("SecurePass1");
    await expect(verifyPassword("WrongPass9", hash)).resolves.toBe(false);
  });

  it("produces a different hash each call (salted)", async () => {
    const h1 = await hashPassword("SamePass1");
    const h2 = await hashPassword("SamePass1");
    expect(h1).not.toBe(h2);
  });
});

describe("validatePasswordStrength", () => {
  it("accepts a valid strong password", () => {
    expect(validatePasswordStrength("Secure123")).toBeNull();
  });

  it("rejects passwords shorter than 8 characters", () => {
    expect(validatePasswordStrength("Ab1")).not.toBeNull();
  });

  it("rejects passwords without an uppercase letter", () => {
    expect(validatePasswordStrength("secure123")).not.toBeNull();
  });

  it("rejects passwords without a lowercase letter", () => {
    expect(validatePasswordStrength("SECURE123")).not.toBeNull();
  });

  it("rejects passwords without a number", () => {
    expect(validatePasswordStrength("SecurePass")).not.toBeNull();
  });
});

describe("generateResetToken / hashResetToken", () => {
  it("generates a 64-char hex token", () => {
    const { token } = generateResetToken();
    expect(token).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it("stores a SHA-256 hash of the token, not the raw token", () => {
    const { token, hash } = generateResetToken();
    expect(hash).not.toBe(token);
    const expected = createHash("sha256").update(token).digest("hex");
    expect(hash).toBe(expected);
  });

  it("hashResetToken is deterministic", () => {
    const { token } = generateResetToken();
    expect(hashResetToken(token)).toBe(hashResetToken(token));
  });

  it("different tokens produce different hashes", () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a.hash).not.toBe(b.hash);
  });
});
