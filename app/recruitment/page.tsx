/**
 * /recruitment — Recruitment Management (recruitment.manage)
 */

import { requirePermission } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import NavBar from "@/components/NavBar";
import PageHeader from "@/components/ui/PageHeader";
import RecruitmentManagement from "@/components/recruitment/RecruitmentManagement";

export const metadata = { title: "Recruitment — HR Management" };

export default async function RecruitmentPage() {
  const { session } = await requirePermission(PERMISSIONS.RECRUITMENT_MANAGE);

  return (
    <div className="dashboard-layout">
      <NavBar user={session.user} />
      <main className="dashboard-content">
        <PageHeader
          title="Recruitment"
          subtitle="Job openings, candidates, resumes and interview scheduling"
        />
        <RecruitmentManagement />
      </main>
    </div>
  );
}
