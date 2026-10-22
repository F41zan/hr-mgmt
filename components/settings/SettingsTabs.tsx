"use client";

import { useState } from "react";
import Link from "next/link";
import Tabs from "@/components/ui/Tabs";
import ContactDetailsForm from "@/components/account/ContactDetailsForm";
import ProfileForm from "@/components/account/ProfileForm";
import AdminUserTable from "@/components/admin/AdminUserTable";
import PermissionsMatrix from "./PermissionsMatrix";
import AuditLogViewer from "./AuditLogViewer";

type TabId = "profile" | "permissions" | "users" | "audit";

export default function SettingsTabs({
  name,
  isAdmin,
  canViewAudit,
}: {
  name: string;
  isAdmin: boolean;
  canViewAudit: boolean;
}) {
  const [tab, setTab] = useState<TabId>("profile");

  const tabs: { id: TabId; label: string }[] = [{ id: "profile", label: "Profile" }];
  if (isAdmin) tabs.push({ id: "permissions", label: "User Permissions" }, { id: "users", label: "User Accounts" });
  if (canViewAudit) tabs.push({ id: "audit", label: "Audit Logs" });

  return (
    <div>
      {tabs.length > 1 && <Tabs tabs={tabs} active={tab} onChange={setTab} />}

      {tab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="stat-card"><ProfileForm initialName={name} /></div>
          <div className="stat-card"><ContactDetailsForm /></div>
          <div className="stat-card flex items-center justify-between lg:col-span-2">
            <div>
              <p className="font-semibold text-sm">Password & security</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Change your password regularly. Sessions expire after 8 hours.</p>
            </div>
            <Link href="/account/change-password" className="btn-secondary w-auto px-4 py-2 text-sm">Change password</Link>
          </div>
        </div>
      )}
      {tab === "permissions" && <PermissionsMatrix />}
      {tab === "users" && <AdminUserTable />}
      {tab === "audit" && <AuditLogViewer />}
    </div>
  );
}
