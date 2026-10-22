/**
 * /notifications — All of the current user's notifications
 */

import { requireAuth } from "@/lib/dal";
import NavBar from "@/components/NavBar";
import PageHeader from "@/components/ui/PageHeader";
import NotificationList from "@/components/notifications/NotificationList";

export const metadata = { title: "Notifications — HR Management" };

export default async function NotificationsPage() {
  const session = await requireAuth();

  return (
    <div className="dashboard-layout">
      <NavBar user={session.user} />
      <main className="dashboard-content max-w-3xl">
        <PageHeader
          title="Notifications"
          subtitle="Leave updates, interview reminders and payslip notifications"
        />
        <NotificationList />
      </main>
    </div>
  );
}
