/**
 * /settings — Settings & Security
 * Everyone: profile + contact details. Admin: permissions & user accounts.
 * audit.view holders: audit logs.
 */

import { requirePermission } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import NavBar from "@/components/NavBar";
import PageHeader from "@/components/ui/PageHeader";
import SettingsTabs from "@/components/settings/SettingsTabs";

export const metadata = { title: "Settings — HR Management" };

export default async function SettingsPage() {
  const { session, can } = await requirePermission();

  return (
    <div className="dashboard-layout">
      <NavBar user={session.user} />
      <main className="dashboard-content">
        <PageHeader title="Settings & Security" subtitle="Profile, user permissions and audit trail" />
        <SettingsTabs
          name={session.user.name}
          isAdmin={session.role === "admin"}
          canViewAudit={can(PERMISSIONS.AUDIT_VIEW)}
        />
      </main>
    </div>
  );
}
