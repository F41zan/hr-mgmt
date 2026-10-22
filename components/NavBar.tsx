"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SafeUser } from "@/lib/models/User";
import type { Permission } from "@/lib/permissions";
import NotificationBell from "@/components/notifications/NotificationBell";

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

interface NavLink {
  href: string;
  label: string;
  staffOnly?: boolean; // admin + HR
  employeeOnly?: boolean;
  permission?: Permission; // shown only with this permission
  hideWith?: Permission; // hidden when the user has this permission
}

const isStaff = (role: string) => role === "admin" || role === "hr";

/** Order = display order. Visibility mirrors the server-side checks on each page. */
const NAV_LINKS: NavLink[] = [
  { href: "/employees", label: "Employees", staffOnly: true },
  { href: "/departments", label: "Departments", staffOnly: true },
  { href: "/attendance", label: "Attendance", staffOnly: true },
  { href: "/my-attendance", label: "My Attendance", employeeOnly: true },
  { href: "/leaves", label: "Leave" },
  { href: "/payroll", label: "Payroll", permission: "payroll.manage" },
  { href: "/my-payslips", label: "Payslips", hideWith: "payroll.manage" },
  { href: "/recruitment", label: "Recruitment", permission: "recruitment.manage" },
  { href: "/reports", label: "Reports", permission: "reports.view" },
  { href: "/settings", label: "Settings" },
];

export default function NavBar({ user }: NavBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [permissions, setPermissions] = useState<Permission[] | null>(null);

  useEffect(() => {
    fetch("/api/settings/permissions?me=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { permissions: Permission[] } | null) => setPermissions(d?.permissions ?? []))
      .catch(() => setPermissions([]));
  }, []);

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

  const can = (p: Permission) => user.role === "admin" || (permissions ?? []).includes(p);
  const links = NAV_LINKS.filter((l) => {
    if (l.staffOnly && !isStaff(user.role)) return false;
    if (l.employeeOnly && isStaff(user.role)) return false;
    // Hide permission-dependent links until permissions load (avoids a flash)
    if ((l.permission || l.hideWith) && permissions === null) return false;
    if (l.permission && !can(l.permission)) return false;
    if (l.hideWith && can(l.hideWith)) return false;
    return true;
  });
  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  const linkClass = (href: string) =>
    `text-sm transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] rounded px-2 py-1 whitespace-nowrap ${
      isActive(href)
        ? "text-[var(--color-primary)] font-semibold"
        : "text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
    }`;

  return (
    <nav className="dashboard-nav relative" aria-label="Main navigation">
      {/* Brand */}
      <Link
        href={dashboardHref}
        className="flex items-center gap-2 font-bold text-[var(--color-text)] text-lg focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] rounded shrink-0"
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

      {/* Desktop links */}
      <div className="hidden xl:flex items-center gap-0.5 mx-4 overflow-x-auto">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={linkClass(l.href)}>
            {l.label}
          </Link>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <NotificationBell />

        {/* Role badge */}
        <span
          className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleBadgeStyle[user.role] ?? ""}`}
        >
          {roleLabel[user.role] ?? user.role}
        </span>

        {/* User name */}
        <Link
          href="/account/profile"
          className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] hidden md:block"
        >
          {user.name}
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="btn-secondary text-sm px-3 py-1.5 hidden sm:inline-flex"
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

        {/* Mobile menu toggle */}
        <button
          className="xl:hidden p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)]"
          onClick={() => setShowMenu((s) => !s)}
          aria-expanded={showMenu}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {showMenu ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {showMenu && (
        <div
          className="xl:hidden absolute top-full left-0 right-0 bg-white border-b border-[var(--color-primary-border)] shadow-lg z-40 px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-1"
          onClick={(e) => (e.target as HTMLElement).closest("a") && setShowMenu(false)}
        >
          <Link href={dashboardHref} className={linkClass(dashboardHref)}>Dashboard</Link>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)}>
              {l.label}
            </Link>
          ))}
          <Link href="/account/profile" className={linkClass("/account/profile")}>Profile</Link>
          <button onClick={handleLogout} disabled={loggingOut} className="text-left text-sm text-red-600 px-2 py-1 sm:hidden">
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      )}
    </nav>
  );
}
