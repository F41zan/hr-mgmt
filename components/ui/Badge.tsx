"use client";

const colors: Record<string, string> = {
  // generic
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  // leave
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
  // payroll
  draft: "bg-yellow-100 text-yellow-700",
  published: "bg-green-100 text-green-700",
  // recruitment
  open: "bg-green-100 text-green-700",
  on_hold: "bg-yellow-100 text-yellow-700",
  closed: "bg-gray-100 text-gray-600",
  applied: "bg-blue-100 text-blue-700",
  screening: "bg-indigo-100 text-indigo-700",
  interview: "bg-purple-100 text-purple-700",
  offered: "bg-teal-100 text-teal-700",
  hired: "bg-green-100 text-green-700",
  withdrawn: "bg-gray-100 text-gray-600",
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  no_show: "bg-red-100 text-red-700",
  // attendance
  present: "bg-green-100 text-green-700",
  absent: "bg-red-100 text-red-700",
  "half-day": "bg-yellow-100 text-yellow-700",
  "on-leave": "bg-blue-100 text-blue-700",
};

export function humanize(value: string): string {
  const s = value.replace(/[_-]/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Badge({ value, label }: { value: string; label?: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${colors[value] ?? "bg-gray-100 text-gray-600"}`}
    >
      {label ?? humanize(value)}
    </span>
  );
}
