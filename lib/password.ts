/**
 * lib/password.ts
 * Secure password hashing with bcryptjs (bcrypt, cost factor 12).
 * Runs server-side only.
 */

import "server-only";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";

const SALT_ROUNDS = 12;

/** Hash a plaintext password. */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

/** Compare plaintext against stored hash. */
export async function verifyPassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

/** Validate password strength on the server. */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password))
    return "Password must contain an uppercase letter.";
  if (!/[a-z]/.test(password))
    return "Password must contain a lowercase letter.";
  if (!/\d/.test(password)) return "Password must contain a number.";
  return null; // valid
}

/**
 * Generate a cryptographically secure, URL-safe reset token.
 * Returns both the raw token (to embed in the email link — NOT stored)
 * and its SHA-256 hash (stored in the database).
 */
export function generateResetToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

/** Hash a raw token for database lookup (SHA-256). */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
