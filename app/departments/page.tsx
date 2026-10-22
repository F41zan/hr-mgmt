/**
 * /departments — Department Management Page (admin/hr only)
 */

import { requireAnyRole } from "@/lib/dal";
import NavBar from "@/components/NavBar";
import DepartmentList from "@/components/departments/DepartmentList";

export const metadata = { title: "Department Management — HR Management" };

export default async function DepartmentsPage() {
  const session = await requireAnyRole("admin", "hr");

  return (
    <div className="dashboard-layout">
      <NavBar user={session.user} />
      <main className="dashboard-content">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            Department Management
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            Manage departments and designations
          </p>
        </div>

        <DepartmentList session={session} />
      </main>
    </div>
  );
}
