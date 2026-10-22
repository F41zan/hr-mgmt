/**
 * /my-attendance - Employee's Own Attendance Page
 */

import { requireAuth } from "@/lib/dal";
import NavBar from "@/components/NavBar";
import MyAttendance from "@/components/attendance/MyAttendance";

export const metadata = {
  title: "My Attendance — HR Management",
};

export default async function MyAttendancePage() {
  const session = await requireAuth();

  return (
    <div className="dashboard-layout">
      <NavBar user={session.user} />
      <main className="dashboard-content">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            My Attendance
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            View and manage your attendance records
          </p>
        </div>

        <MyAttendance />
      </main>
    </div>
  );
}
