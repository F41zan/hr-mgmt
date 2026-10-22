/**
 * /employee/dashboard — Employee-only. Shows own data only.
 */
import { requireRole } from "@/lib/dal";
import NavBar from "@/components/NavBar";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const metadata = { title: "My Dashboard — HR Management" };

export default async function EmployeeDashboardPage() {
  const session = await requireRole("employee");

  return (
    <div className="dashboard-layout">
      <NavBar user={session.user} />
      <main className="dashboard-content">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            My Dashboard
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            Welcome back,{" "}
            <span className="font-semibold">{session.user.name}</span>. Here's
            your personal overview.
          </p>
        </div>

        {/* Employee-specific dashboard */}
        <DashboardClient user={session.user} />
      </main>
    </div>
  );
}
