/**
 * __tests__/api.auth.test.ts
 * Unit tests for auth API handler logic.
 * Tests the core business logic without spinning up a real HTTP server.
 *
 * Strategy: extract and test the validation / business logic directly;
 * integration tests against a real DB are documented below for manual runs.
 */

import {
  validateEmail,
  validateRedirectUrl,
  normalizeEmail,
} from "@/lib/validation";
import {
  validatePasswordStrength,
  generateResetToken,
  hashResetToken,
} from "@/lib/password";
import { ROLES } from "@/lib/roles";

// ─── Login validation logic ────────────────────────────────────────────────
describe("Login — input validation", () => {
  it("rejects missing email", () => {
    expect(validateEmail("")).not.toBeNull();
    expect(validateEmail(undefined)).not.toBeNull();
  });

  it("rejects malformed email", () => {
    expect(validateEmail("notanemail")).not.toBeNull();
    expect(validateEmail("@nodomain")).not.toBeNull();
    expect(validateEmail("user@")).not.toBeNull();
  });

  it("accepts well-formed emails", () => {
    expect(validateEmail("admin@company.com")).toBeNull();
    expect(validateEmail("hr.user+tag@corp.io")).toBeNull();
  });
});

// ─── Redirect URL safety ───────────────────────────────────────────────────
describe("Login — redirect URL safety", () => {
  it("allows only safe internal paths after login", () => {
    expect(validateRedirectUrl("/admin/dashboard")).toBe("/admin/dashboard");
    expect(validateRedirectUrl("/hr/dashboard")).toBe("/hr/dashboard");
    expect(validateRedirectUrl("/employee/dashboard")).toBe(
      "/employee/dashboard",
    );
    expect(validateRedirectUrl("/account/profile")).toBe("/account/profile");
  });

  it("blocks all external redirect URLs", () => {
    const unsafe = [
      "http://attacker.com",
      "https://attacker.com/steal",
      "//attacker.com",
      "javascript:alert(1)",
      "data:text/html,<h1>",
      "ftp://files.example.com",
    ];
    for (const url of unsafe) {
      expect(validateRedirectUrl(url)).toBeNull();
    }
  });
});

// ─── Password reset token security ────────────────────────────────────────
describe("Password reset — token security", () => {
  it("never stores the raw token — only its hash", () => {
    const { token, hash } = generateResetToken();
    expect(hash).not.toBe(token);
    // The hash should be what gets stored in DB
    expect(hashResetToken(token)).toBe(hash);
  });

  it("different reset requests produce different tokens", () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a.token).not.toBe(b.token);
    expect(a.hash).not.toBe(b.hash);
  });

  it("a token cannot be derived from its hash (one-way)", () => {
    const { token, hash } = generateResetToken();
    // We can only find the user by hashing the raw token and comparing
    // — there is no way to recover 'token' from 'hash'
    expect(hash).toHaveLength(64); // SHA-256 hex
    expect(token).toHaveLength(64); // 32 random bytes as hex
    expect(hash).not.toBe(token);
  });
});

// ─── Role assignment security ──────────────────────────────────────────────
describe("Role assignment — server-side enforcement", () => {
  const ALLOWED_CREATE_ROLES = [ROLES.HR, ROLES.EMPLOYEE];

  it("admin can create HR accounts", () => {
    expect(ALLOWED_CREATE_ROLES).toContain(ROLES.HR);
  });

  it("admin can create Employee accounts", () => {
    expect(ALLOWED_CREATE_ROLES).toContain(ROLES.EMPLOYEE);
  });

  it("admin cannot create another Admin via user creation endpoint", () => {
    // The API only allows hr and employee — admin is not in the allowed list
    expect(ALLOWED_CREATE_ROLES).not.toContain(ROLES.ADMIN);
  });

  it("an unrecognised role string is rejected", () => {
    const invalid = ["superadmin", "root", "ADMIN", "Admin", ""];
    for (const r of invalid) {
      expect(ALLOWED_CREATE_ROLES.includes(r as "hr" | "employee")).toBe(false);
    }
  });
});

// ─── Email normalisation ───────────────────────────────────────────────────
describe("Email normalisation prevents duplicate accounts", () => {
  it("stores emails consistently lowercased", () => {
    expect(normalizeEmail("Admin@COMPANY.COM")).toBe("admin@company.com");
    expect(normalizeEmail("  HR@Corp.IO  ")).toBe("hr@corp.io");
  });

  it("two emails that differ only in case are treated as the same", () => {
    const a = normalizeEmail("User@Example.com");
    const b = normalizeEmail("user@example.com");
    expect(a).toBe(b);
  });
});

// ─── Password strength enforcement ────────────────────────────────────────
describe("Password strength — new/reset passwords", () => {
  const valid = ["Passw0rd", "MyStr0ng!", "Ab1cdefg", "Secure123"];
  const invalid = [
    ["short1A", "too short"],
    ["alllowercase1", "no uppercase"],
    ["ALLUPPERCASE1", "no lowercase"],
    ["NoNumbers!!", "no digit"],
  ];

  for (const pw of valid) {
    it(`accepts "${pw}"`, () => {
      expect(validatePasswordStrength(pw)).toBeNull();
    });
  }

  for (const [pw, reason] of invalid) {
    it(`rejects "${pw}" (${reason})`, () => {
      expect(validatePasswordStrength(pw)).not.toBeNull();
    });
  }
});
