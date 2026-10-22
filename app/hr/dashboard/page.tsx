/**
 * /hr/dashboard — HR-only. Verified server-side.
 */
import { requireRole } from "@/lib/dal";
import NavBar from "@/components/NavBar";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const metadata = { title: "HR Dashboard — HR Management" };

export default async function HRDashboardPage() {
  const session = await requireRole("hr");

  return (
    <div className="dashboard-layout">
      <NavBar user={session.user} />
      <main className="dashboard-content">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            HR Dashboard
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            Welcome back,{" "}
            <span className="font-semibold">{session.user.name}</span>. Here's
            your workforce summary.
          </p>
        </div>

        {/* Dashboard stats, charts, and tables */}
        <DashboardClient user={session.user} />
      </main>
    </div>
  );
}
