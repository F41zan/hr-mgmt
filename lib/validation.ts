/**
 * lib/validation.ts
 * Server-side input validation helpers.
 * These run only on the server — never trust client-side validation alone.
 */

export function validateEmail(email: unknown): string | null {
  if (typeof email !== "string" || !email.trim()) return "Email is required.";
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Invalid email address.";
  return null;
}

export function validateName(name: unknown): string | null {
  if (typeof name !== "string" || !name.trim()) return "Name is required.";
  if (name.trim().length > 100) return "Name must be ≤ 100 characters.";
  return null;
}

export function validateRequired(value: unknown, label: string): string | null {
  if (typeof value !== "string" || !value.trim())
    return `${label} is required.`;
  return null;
}

/**
 * Validate a redirect destination URL.
 * Only allow internal paths that start with "/" and do not contain "//".
 * Rejects external URLs, data URIs, and any path that could redirect offsite.
 */
export function validateRedirectUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  if (url.startsWith("/") && !url.startsWith("//") && !url.includes("://")) {
    return url;
  }
  return null; // discard unsafe URL
}

/** Normalise email: lowercase + trim. */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
