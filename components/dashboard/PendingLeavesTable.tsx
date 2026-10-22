"use client";

import { useState } from "react";
import StatusBadge from "./StatusBadge";

interface LeaveRow {
  id: string;
  employee: { name: string; employeeId: string; department: string };
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
  submittedAt: string;
}

interface Props {
  leaves: LeaveRow[];
  canReview: boolean;
  onAction?: (id: string, action: "approved" | "rejected") => Promise<void>;
}

export default function PendingLeavesTable({
  leaves,
  canReview,
  onAction,
}: Props) {
  const [acting, setActing] = useState<Record<string, boolean>>({});
  const [localLeaves, setLocalLeaves] = useState(leaves);

  async function handle(id: string, action: "approved" | "rejected") {
    setActing((p) => ({ ...p, [id]: true }));
    try {
      await onAction?.(id, action);
      setLocalLeaves((prev) => prev.filter((l) => l.id !== id));
    } finally {
      setActing((p) => ({ ...p, [id]: false }));
    }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  if (!localLeaves.length) {
    return (
      <div className="stat-card">
        <h3 className="font-semibold text-[var(--color-text)] mb-4">
          Pending Leave Requests
        </h3>
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <p className="text-[var(--color-text-secondary)] text-sm">
            No pending leave requests
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-primary-border)] flex items-center justify-between">
        <h3 className="font-semibold text-[var(--color-text)]">
          Pending Leave Requests
        </h3>
        <span className="text-xs font-semibold bg-yellow-100 text-yellow-700 px-2.5 py-0.5 rounded-full">
          {localLeaves.length} pending
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-primary-light)] text-[var(--color-text-secondary)] text-left">
              {[
                "Employee",
                "Dept",
                "Type",
                "Period",
                "Days",
                "Submitted",
                "Status",
                canReview ? "Actions" : "",
              ]
                .filter(Boolean)
                .map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 font-semibold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-primary-border)]">
            {localLeaves.map((l) => (
              <tr
                key={l.id}
                className="hover:bg-[var(--color-primary-light)] transition-colors"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--color-text)]">
                    {l.employee.name}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {l.employee.employeeId}
                  </p>
                </td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)] whitespace-nowrap">
                  {l.employee.department}
                </td>
                <td className="px-4 py-3 capitalize whitespace-nowrap">
                  {l.leaveType}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-[var(--color-text-secondary)]">
                  {fmt(l.startDate)} – {fmt(l.endDate)}
                </td>
                <td className="px-4 py-3 text-center font-semibold">
                  {l.totalDays}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-[var(--color-text-secondary)]">
                  {fmt(l.submittedAt)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={l.status} />
                </td>
                {canReview && (
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        disabled={acting[l.id]}
                        onClick={() => handle(l.id, "approved")}
                        className="text-xs px-3 py-1 rounded-md bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        {acting[l.id] ? "…" : "Approve"}
                      </button>
                      <button
                        disabled={acting[l.id]}
                        onClick={() => handle(l.id, "rejected")}
                        className="text-xs px-3 py-1 rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
