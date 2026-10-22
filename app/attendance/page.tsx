/**
 * /attendance - Attendance Management Page (Admin/HR)
 */

import { requireAnyRole } from "@/lib/dal";
import NavBar from "@/components/NavBar";
import AttendanceManagement from "@/components/attendance/AttendanceManagement";

export const metadata = {
  title: "Attendance Management — HR Management",
};

export default async function AttendancePage() {
  const session = await requireAnyRole("admin", "hr");

  return (
    <div className="dashboard-layout">
      <NavBar user={session.user} />
      <main className="dashboard-content">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            Attendance Management
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            Monitor and manage employee attendance records
          </p>
        </div>

        <AttendanceManagement />
      </main>
    </div>
  );
}
