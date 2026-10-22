/**
 * /leaves — Leave Management
 * Everyone: apply, balance, history. leave.approve holders: review requests.
 */

import { requirePermission } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import { getOwnEmployee } from "@/lib/leaveService";
import NavBar from "@/components/NavBar";
import PageHeader from "@/components/ui/PageHeader";
import LeaveManagement from "@/components/leaves/LeaveManagement";

export const metadata = { title: "Leave Management — HR Management" };

export default async function LeavesPage() {
  const { session, can } = await requirePermission();
  const own = await getOwnEmployee(session);
  const canApprove = can(PERMISSIONS.LEAVE_APPROVE);

  return (
    <div className="dashboard-layout">
      <NavBar user={session.user} />
      <main className="dashboard-content">
        <PageHeader
          title="Leave Management"
          subtitle={
            canApprove
              ? "Review leave requests and manage your own leave"
              : "Apply for leave and track your balance"
          }
        />
        <LeaveManagement canApprove={canApprove} hasEmployeeRecord={!!own} />
      </main>
    </div>
  );
}
