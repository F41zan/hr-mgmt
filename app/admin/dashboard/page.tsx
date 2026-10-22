/**
 * /admin/dashboard — Admin-only. Verified server-side.
 */
import { requireRole } from "@/lib/dal";
import NavBar from "@/components/NavBar";
import DashboardClient from "@/components/dashboard/DashboardClient";
import AdminUserTable from "@/components/admin/AdminUserTable";

export const metadata = { title: "Admin Dashboard — HR Management" };

export default async function AdminDashboardPage() {
  const session = await requireRole("admin");

  return (
    <div className="dashboard-layout">
      <NavBar user={session.user} />
      <main className="dashboard-content">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            Admin Dashboard
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            Welcome back,{" "}
            <span className="font-semibold">{session.user.name}</span>. Here's
            your organization overview.
          </p>
        </div>

        {/* Dashboard stats, charts, and tables */}
        <DashboardClient user={session.user} />

        {/* User management section */}
        <div className="mt-8" id="users">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">
              User Account Management
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
              Create and manage HR and Employee accounts
            </p>
          </div>
          <AdminUserTable />
        </div>
      </main>
    </div>
  );
}
