/**
 * /account/change-password
 * All authenticated roles can change their own password.
 */

import { requireAuth } from "@/lib/dal";
import NavBar from "@/components/NavBar";
import ChangePasswordForm from "@/components/account/ChangePasswordForm";
import Link from "next/link";

export const metadata = { title: "Change Password — HR Management" };

export default async function ChangePasswordPage() {
  const session = await requireAuth();

  return (
    <div className="dashboard-layout">
      <NavBar user={session.user} />
      <main className="dashboard-content max-w-2xl">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6 text-sm text-[var(--color-text-secondary)]"
        >
          <Link
            href={
              session.user.role === "admin"
                ? "/admin/dashboard"
                : session.user.role === "hr"
                  ? "/hr/dashboard"
                  : "/employee/dashboard"
            }
            className="hover:text-[var(--color-primary)] transition-colors"
          >
            Dashboard
          </Link>
          <span className="mx-2" aria-hidden="true">
            ›
          </span>
          <Link
            href="/account/profile"
            className="hover:text-[var(--color-primary)] transition-colors"
          >
            Profile
          </Link>
          <span className="mx-2" aria-hidden="true">
            ›
          </span>
          <span className="text-[var(--color-text)]">Change password</span>
        </nav>

        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">
          Change password
        </h1>

        <div className="stat-card">
          <ChangePasswordForm />
        </div>
      </main>
    </div>
  );
}
