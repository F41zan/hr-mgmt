/**
 * /payroll — Payroll Management (payroll.manage)
 */

import { requirePermission } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import NavBar from "@/components/NavBar";
import PageHeader from "@/components/ui/PageHeader";
import PayrollManagement from "@/components/payroll/PayrollManagement";

export const metadata = { title: "Payroll — HR Management" };

export default async function PayrollPage() {
  const { session } = await requirePermission(PERMISSIONS.PAYROLL_MANAGE);

  return (
    <div className="dashboard-layout">
      <NavBar user={session.user} />
      <main className="dashboard-content">
        <PageHeader
          title="Payroll Management"
          subtitle="Salary structures, monthly payroll runs and payslips"
        />
        <PayrollManagement />
      </main>
    </div>
  );
}
