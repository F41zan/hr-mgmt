/**
 * lib/leavePolicy.ts
 * Yearly leave entitlements. Safe to import from client components.
 * `null` means no limit (unpaid leave reduces salary instead of a balance).
 */

export const LEAVE_TYPES = [
  "annual",
  "sick",
  "casual",
  "unpaid",
  "maternity",
  "paternity",
] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_STATUS = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
] as const;
export type LeaveStatus = (typeof LEAVE_STATUS)[number];

export const LEAVE_ENTITLEMENTS: Record<LeaveType, number | null> = {
  annual: 18,
  sick: 12,
  casual: 8,
  maternity: 182,
  paternity: 15,
  unpaid: null,
};

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: "Annual",
  sick: "Sick",
  casual: "Casual",
  unpaid: "Unpaid",
  maternity: "Maternity",
  paternity: "Paternity",
};

export interface LeaveBalanceRow {
  leaveType: LeaveType;
  entitled: number | null;
  used: number;
  pending: number;
  remaining: number | null;
}
