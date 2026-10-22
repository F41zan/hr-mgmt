/**
 * /my-payslips — Own published payslips (all roles with an employee record)
 */

import { requireAuth } from "@/lib/dal";
import NavBar from "@/components/NavBar";
import PageHeader from "@/components/ui/PageHeader";
import MyPayslips from "@/components/payroll/MyPayslips";

export const metadata = { title: "My Payslips — HR Management" };

export default async function MyPayslipsPage() {
  const session = await requireAuth();

  return (
    <div className="dashboard-layout">
      <NavBar user={session.user} />
      <main className="dashboard-content">
        <PageHeader title="My Payslips" subtitle="View and download your monthly payslips" />
        <MyPayslips />
      </main>
    </div>
  );
}
