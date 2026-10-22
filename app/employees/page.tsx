/**
 * /employees — Employee Management Page (admin/hr only)
 */

import { requireAnyRole } from "@/lib/dal";
import NavBar from "@/components/NavBar";
import EmployeeList from "@/components/employees/EmployeeList";

export const metadata = { title: "Employee Management — HR Management" };

export default async function EmployeesPage() {
  const session = await requireAnyRole("admin", "hr");

  return (
    <div className="dashboard-layout">
      <NavBar user={session.user} />
      <main className="dashboard-content">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            Employee Management
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            Manage employee records and assignments
          </p>
        </div>

        <EmployeeList session={session} />
      </main>
    </div>
  );
}
