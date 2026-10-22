/**
 * /recruitment/my-interviews — Interviews the current user is assigned to (any role)
 */

import { requireAuth } from "@/lib/dal";
import NavBar from "@/components/NavBar";
import PageHeader from "@/components/ui/PageHeader";
import InterviewsTab from "@/components/recruitment/InterviewsTab";

export const metadata = { title: "My Interviews — HR Management" };

export default async function MyInterviewsPage() {
  const session = await requireAuth();

  return (
    <div className="dashboard-layout">
      <NavBar user={session.user} />
      <main className="dashboard-content">
        <PageHeader
          title="My Interviews"
          subtitle="Interviews you are on the panel for — record feedback after each one"
        />
        <InterviewsTab scope="mine" />
      </main>
    </div>
  );
}
