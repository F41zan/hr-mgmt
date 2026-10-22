/**
 * __tests__/validation.test.ts
 * Tests for server-side input validation and redirect URL safety.
 */

import {
  validateEmail,
  validateName,
  validateRequired,
  validateRedirectUrl,
  normalizeEmail,
} from "@/lib/validation";

describe("validateEmail", () => {
  it("accepts a valid email", () =>
    expect(validateEmail("user@example.com")).toBeNull());
  it("accepts email with subdomain", () =>
    expect(validateEmail("u@sub.domain.org")).toBeNull());
  it("rejects empty string", () => expect(validateEmail("")).not.toBeNull());
  it("rejects non-string", () => expect(validateEmail(42)).not.toBeNull());
  it("rejects email without @", () =>
    expect(validateEmail("notanemail")).not.toBeNull());
  it("rejects email without domain", () =>
    expect(validateEmail("user@")).not.toBeNull());
});

describe("validateName", () => {
  it("accepts a valid name", () =>
    expect(validateName("Alice Smith")).toBeNull());
  it("rejects empty string", () => expect(validateName("")).not.toBeNull());
  it("rejects name over 100 chars", () =>
    expect(validateName("A".repeat(101))).not.toBeNull());
  it("accepts exactly 100 chars", () =>
    expect(validateName("A".repeat(100))).toBeNull());
});

describe("validateRequired", () => {
  it("accepts non-empty string", () =>
    expect(validateRequired("value", "Field")).toBeNull());
  it("rejects empty string", () =>
    expect(validateRequired("", "Field")).not.toBeNull());
  it("rejects whitespace-only", () =>
    expect(validateRequired("   ", "Field")).not.toBeNull());
});

describe("validateRedirectUrl", () => {
  it("allows an internal path", () =>
    expect(validateRedirectUrl("/admin/dashboard")).toBe("/admin/dashboard"));
  it("blocks external http URL", () =>
    expect(validateRedirectUrl("http://evil.com")).toBeNull());
  it("blocks external https URL", () =>
    expect(validateRedirectUrl("https://evil.com")).toBeNull());
  it("blocks protocol-relative URL (//)", () =>
    expect(validateRedirectUrl("//evil.com")).toBeNull());
  it("blocks javascript: URI", () =>
    expect(validateRedirectUrl("javascript:alert(1)")).toBeNull());
  it("returns null for non-string", () =>
    expect(validateRedirectUrl(null)).toBeNull());
  it("allows /login", () =>
    expect(validateRedirectUrl("/login")).toBe("/login"));
});

describe("normalizeEmail", () => {
  it("lowercases email", () =>
    expect(normalizeEmail("USER@EXAMPLE.COM")).toBe("user@example.com"));
  it("trims whitespace", () =>
    expect(normalizeEmail("  user@example.com  ")).toBe("user@example.com"));
});
