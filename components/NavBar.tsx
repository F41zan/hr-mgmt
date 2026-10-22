"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SafeUser } from "@/lib/models/User";

interface NavBarProps {
  user: SafeUser;
}

const roleLabel: Record<string, string> = {
  admin: "Admin",
  hr: "HR",
  employee: "Employee",
};

const roleBadgeStyle: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  hr: "bg-blue-100 text-blue-700",
  employee: "bg-green-100 text-green-700",
};

export default function NavBar({ user }: NavBarProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  const dashboardHref =
    user.role === "admin"
      ? "/admin/dashboard"
      : user.role === "hr"
        ? "/hr/dashboard"
        : "/employee/dashboard";

  const canAccessEmployees = user.role === "admin" || user.role === "hr";
  const canAccessDepartments = user.role === "admin" || user.role === "hr";

  return (
    <nav className="dashboard-nav" aria-label="Main navigation">
      {/* Brand */}
      <Link
        href={dashboardHref}
        className="flex items-center gap-2 font-bold text-[var(--color-text)] text-lg focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] rounded"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          aria-hidden="true"
        >
          <rect width="28" height="28" rx="8" fill="#2563EB" />
          <path
            d="M8 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="14" cy="10" r="3" stroke="#fff" strokeWidth="2" />
        </svg>
        <span className="hidden sm:inline">HR Management</span>
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Navigation Links for Admin/HR */}
        {canAccessEmployees && (
          <>
            <Link
              href="/employees"
              className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] rounded px-2 py-1 hidden lg:block"
            >
              Employees
            </Link>
            <Link
              href="/departments"
              className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] rounded px-2 py-1 hidden lg:block"
            >
              Departments
            </Link>
            <Link
              href="/attendance"
              className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] rounded px-2 py-1 hidden lg:block"
            >
              Attendance
            </Link>
          </>
        )}

        {/* Attendance link for all users */}
        {user.role === "employee" && (
          <Link
            href="/my-attendance"
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] rounded px-2 py-1 hidden lg:block"
          >
            My Attendance
          </Link>
        )}

        {/* Role badge */}
        <span
          className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleBadgeStyle[user.role] ?? ""}`}
        >
          {roleLabel[user.role] ?? user.role}
        </span>

        {/* User name */}
        <span className="text-sm font-medium text-[var(--color-text)] hidden md:block">
          {user.name}
        </span>

        {/* Nav links */}
        <Link
          href="/account/profile"
          className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] rounded px-1"
        >
          Profile
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="btn-secondary text-sm px-3 py-1.5"
          aria-label="Log out"
        >
          {loggingOut ? (
            <span className="flex items-center gap-1.5">
              <span className="spinner w-3 h-3" />
              Logging out…
            </span>
          ) : (
            "Log out"
          )}
        </button>
      </div>
    </nav>
  );
}
