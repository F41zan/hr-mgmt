/**
 * lib/permissions.ts
 * Module-level permissions on top of the three base roles.
 *
 * Admin always has every permission. HR and Employee start from the defaults
 * below; an Admin can change them in Settings → Permissions (stored in the
 * `role_permissions` collection).
 */

import type { Role } from "@/lib/roles";

export const PERMISSIONS = {
  LEAVE_APPROVE: "leave.approve",
  PAYROLL_MANAGE: "payroll.manage",
  RECRUITMENT_MANAGE: "recruitment.manage",
  REPORTS_VIEW: "reports.view",
  AUDIT_VIEW: "audit.view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_VALUES = Object.values(PERMISSIONS) as Permission[];

export const PERMISSION_LABELS: Record<
  Permission,
  { label: string; description: string }
> = {
  "leave.approve": {
    label: "Approve leave",
    description: "View all leave requests and approve or reject them",
  },
  "payroll.manage": {
    label: "Manage payroll",
    description: "Edit salary structures, run payroll and publish payslips",
  },
  "recruitment.manage": {
    label: "Manage recruitment",
    description: "Job openings, candidates, resumes and interviews",
  },
  "reports.view": {
    label: "View reports",
    description: "Attendance, employee and payroll reports and exports",
  },
  "audit.view": {
    label: "View audit logs",
    description: "Read the security audit trail",
  },
};

/** Roles whose permissions can be edited (admin is always full access). */
export const CONFIGURABLE_ROLES = ["hr", "employee"] as const;
export type ConfigurableRole = (typeof CONFIGURABLE_ROLES)[number];

export const DEFAULT_PERMISSIONS: Record<ConfigurableRole, Permission[]> = {
  hr: [
    "leave.approve",
    "payroll.manage",
    "recruitment.manage",
    "reports.view",
  ],
  employee: [],
};

export function hasPermission(
  role: Role,
  granted: Permission[],
  permission: Permission,
): boolean {
  if (role === "admin") return true;
  return granted.includes(permission);
}
