/**
 * lib/roles.ts
 * Centralized role definitions.  Import from here everywhere — never use raw strings.
 */

export const ROLES = {
  ADMIN: "admin",
  HR: "hr",
  EMPLOYEE: "employee",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** All valid role values as a tuple (useful for Mongoose enum validation). */
export const ROLE_VALUES = Object.values(ROLES) as [Role, ...Role[]];

/** Map each role to the dashboard route it should land on after login. */
export const ROLE_DASHBOARD: Record<Role, string> = {
  admin: "/admin/dashboard",
  hr: "/hr/dashboard",
  employee: "/employee/dashboard",
};
