/**
 * /account/profile
 * All authenticated roles can view and update their own name.
 * Role, email, isActive are read-only — not editable here.
 */

import { requireAuth } from "@/lib/dal";
import NavBar from "@/components/NavBar";
import ProfileForm from "@/components/account/ProfileForm";
import Link from "next/link";

export const metadata = { title: "My Profile — HR Management" };

export default async function ProfilePage() {
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
          <span className="text-[var(--color-text)]">Profile</span>
        </nav>

        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">
          My Profile
        </h1>

        <div className="stat-card mb-4">
          {/* Read-only info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 pb-6 border-b border-[var(--color-primary-border)]">
            <div>
              <p className="form-label">Email address</p>
              <p className="text-sm text-[var(--color-text)]">
                {session.user.email}
              </p>
            </div>
            <div>
              <p className="form-label">Role</p>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  session.user.role === "admin"
                    ? "bg-purple-100 text-purple-700"
                    : session.user.role === "hr"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700"
                }`}
              >
                {session.user.role.charAt(0).toUpperCase() +
                  session.user.role.slice(1)}
              </span>
            </div>
            <div>
              <p className="form-label">Member since</p>
              <p className="text-sm text-[var(--color-text)]">
                {new Date(session.user.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="form-label">Last login</p>
              <p className="text-sm text-[var(--color-text)]">
                {session.user.lastLoginAt
                  ? new Date(session.user.lastLoginAt).toLocaleString()
                  : "—"}
              </p>
            </div>
          </div>

          {/* Editable: name only */}
          <ProfileForm initialName={session.user.name} />
        </div>

        {/* Change password link */}
        <div className="stat-card flex items-center justify-between">
          <div>
            <p className="font-semibold text-[var(--color-text)] text-sm">
              Password
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Update your account password
            </p>
          </div>
          <Link
            href="/account/change-password"
            className="btn-secondary w-auto px-4 py-2 text-sm"
          >
            Change password
          </Link>
        </div>
      </main>
    </div>
  );
}
