/**
 * /reports — Reports & Analytics (reports.view)
 */

import { requirePermission } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import NavBar from "@/components/NavBar";
import PageHeader from "@/components/ui/PageHeader";
import ReportsDashboard from "@/components/reports/ReportsDashboard";

export const metadata = { title: "Reports — HR Management" };

export default async function ReportsPage() {
  const { session } = await requirePermission(PERMISSIONS.REPORTS_VIEW);

  return (
    <div className="dashboard-layout">
      <NavBar user={session.user} />
      <main className="dashboard-content">
        <PageHeader
          title="Reports & Analytics"
          subtitle="Attendance, employee statistics and payroll — with CSV exports"
        />
        <ReportsDashboard />
      </main>
    </div>
  );
}
