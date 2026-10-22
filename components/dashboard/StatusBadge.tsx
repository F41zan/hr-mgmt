"use client";

type Status =
  | "present"
  | "absent"
  | "late"
  | "half_day"
  | "on_leave"
  | "pending"
  | "approved"
  | "rejected"
  | "active"
  | "inactive"
  | "not_recorded"
  | string;

const map: Record<string, string> = {
  present: "bg-green-100 text-green-700",
  active: "bg-green-100 text-green-700",
  approved: "bg-green-100 text-green-700",
  absent: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
  inactive: "bg-red-100 text-red-700",
  late: "bg-yellow-100 text-yellow-700",
  pending: "bg-yellow-100 text-yellow-700",
  on_leave: "bg-blue-100 text-blue-700",
  half_day: "bg-purple-100 text-purple-700",
  not_recorded: "bg-gray-100 text-gray-600",
};

const labels: Record<string, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  half_day: "Half Day",
  on_leave: "On Leave",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  active: "Active",
  inactive: "Inactive",
  not_recorded: "Not Recorded",
};

export default function StatusBadge({ status }: { status: Status }) {
  const cls = map[status] ?? "bg-gray-100 text-gray-600";
  const label = labels[status] ?? status;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}
