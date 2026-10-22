/**
 * app/unauthorized.tsx
 * Next.js 16 built-in 401 boundary (rendered by unauthorized() calls).
 */
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="auth-page">
      <div className="auth-card text-center">
        <div
          className="flex items-center justify-center w-16 h-16 rounded-2xl mx-auto mb-6"
          style={{ background: "var(--color-primary-light)" }}
          aria-hidden="true"
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">
          401 — Unauthenticated
        </h1>
        <p className="text-[var(--color-text-secondary)] mb-6 text-sm">
          You must be signed in to access this page.
        </p>
        <Link href="/login" className="btn-primary">
          Sign in
        </Link>
      </div>
    </div>
  );
}
