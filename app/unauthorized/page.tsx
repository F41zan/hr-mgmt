/**
 * app/unauthorized/page.tsx
 * Regular page at /unauthorized — for middleware redirects.
 * The Next.js 16 special file (app/unauthorized.tsx) handles the 401 boundary.
 */
import SignInAgainButton from "@/components/auth/SignInAgainButton";

export const metadata = { title: "Unauthorised — HR Management" };

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
          401 — Sign in required
        </h1>
        <p className="text-[var(--color-text-secondary)] mb-6 text-sm">
          You must be signed in to access this page.
        </p>
        <SignInAgainButton />
      </div>
    </div>
  );
}
