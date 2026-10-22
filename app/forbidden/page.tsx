/**
 * app/forbidden/page.tsx
 * Regular page at /forbidden — for middleware redirects.
 * The Next.js 16 special file (app/forbidden.tsx) handles the 403 boundary.
 */
import Link from "next/link";

export const metadata = { title: "Forbidden — HR Management" };

export default function ForbiddenPage() {
  return (
    <div className="auth-page">
      <div className="auth-card text-center">
        <div
          className="flex items-center justify-center w-16 h-16 rounded-2xl mx-auto mb-6"
          style={{ background: "#FEF2F2" }}
          aria-hidden="true"
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-error)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="9" y1="9" x2="15" y2="15" />
            <line x1="15" y1="9" x2="9" y2="15" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">
          403 — Access denied
        </h1>
        <p className="text-[var(--color-text-secondary)] mb-6 text-sm">
          You don&apos;t have permission to access this page.
        </p>
        <Link href="/" className="btn-primary">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
