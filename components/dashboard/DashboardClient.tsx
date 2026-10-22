"use client";

import { useEffect, useState, useCallback } from "react";
import StatCard from "./StatCard";
import AttendanceChart from "./AttendanceChart";
import DepartmentChart from "./DepartmentChart";
import PendingLeavesTable from "./PendingLeavesTable";
import RecentActivity from "./RecentActivity";
import UpcomingEvents from "./UpcomingEvents";
import QuickActions from "./QuickActions";
import DashboardSkeleton from "./LoadingSkeleton";
import StatusBadge from "./StatusBadge";
import type { SafeUser } from "@/lib/models/User";

// ── Icons ─────────────────────────────────────────────────────────────────────
const Icons = {
  Users: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Check: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22,4 12,14.01 9,11.01" />
    </svg>
  ),
  X: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  Clock: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </svg>
  ),
  Cal: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Trend: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
      <polyline points="16,7 22,7 22,13" />
    </svg>
  ),
  Add: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  List: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
};

// ── Types matching API response ────────────────────────────────────────────────
interface OrgData {
  role: "admin" | "hr";
  employees: {
    total: number;
    active: number;
    inactive: number;
    onLeave: number;
    newHires: number;
  };
  todayAttendance: {
    present: number;
    late: number;
    absent: number;
    onLeave: number;
    total: number;
    attendanceRate: number;
    activeTotal: number;
  };
  trend: {
    date: string;
    present: number;
    absent: number;
    late: number;
    on_leave: number;
  }[];
  leaveSummary: {
    pending: number;
    approved: number;
    rejected: number;
    activeLeave: number;
    total: number;
  };
  pendingLeaves: {
    id: string;
    employee: { name: string; employeeId: string; department: string };
    leaveType: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    status: string;
    submittedAt: string;
  }[];
  departments: { department: string; count: number }[];
  activity: {
    id: string;
    description: string;
    timestamp: string;
    type: string;
  }[];
  events: { name: string; type: string; date: string; daysAway: number }[];
}

interface EmpData {
  role: "employee";
  myAttendance: {
    employee: {
      name: string;
      employeeId: string;
      department: string;
      designation: string;
    };
    todayStatus: string;
    present: number;
    late: number;
    absent: number;
    total: number;
    attendanceRate: number;
    recentRecords: {
      date: string;
      status: string;
      checkIn?: string;
      checkOut?: string;
    }[];
  } | null;
  myLeaves: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
    recent: {
      id: string;
      leaveType: string;
      startDate: string;
      endDate: string;
      totalDays: number;
      status: string;
      reason: string;
    }[];
  } | null;
}

type DashData = OrgData | EmpData;

interface Props {
  user: SafeUser;
}

export default function DashboardClient({ user }: Props) {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(7);
  const [chartLoading, setChartLoading] = useState(false);

  const fetchData = useCallback(async (d: number) => {
    try {
      const res = await fetch(`/api/dashboard/summary?days=${d}`);
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setData(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData(days);
  }, [fetchData, days]);

  const handleRangeChange = (d: number) => {
    setDays(d);
    setChartLoading(true);
    void fetchData(d);
  };

  async function handleLeaveAction(
    id: string,
    action: "approved" | "rejected",
  ) {
    const res = await fetch(`/api/dashboard/leave/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) throw new Error("Action failed");
    // Refresh summary counts
    void fetchData(days);
  }

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="stat-card flex flex-col items-center gap-3 py-10">
        <span className="text-4xl">⚠️</span>
        <p className="font-semibold text-[var(--color-text)]">
          Failed to load dashboard
        </p>
        <p className="text-sm text-[var(--color-text-secondary)]">{error}</p>
        <button
          className="btn-primary w-auto px-6"
          onClick={() => {
            setLoading(true);
            setError("");
            void fetchData(days);
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  // ── EMPLOYEE dashboard ─────────────────────────────────────────────────────
  if (data.role === "employee") {
    const { myAttendance, myLeaves } = data as EmpData;

    const fmt = (iso: string) =>
      new Date(iso).toLocaleDateString("en", {
        day: "2-digit",
        month: "short",
      });

    return (
      <div className="space-y-6">
        {/* Employee info banner */}
        {myAttendance && (
          <div className="stat-card flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center text-2xl font-bold text-[var(--color-primary)] flex-shrink-0">
              {myAttendance.employee.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-xl text-[var(--color-text)]">
                {myAttendance.employee.name}
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {myAttendance.employee.designation} ·{" "}
                {myAttendance.employee.department}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                ID: {myAttendance.employee.employeeId}
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1">
              <p className="text-xs text-[var(--color-text-secondary)]">
                Today's status
              </p>
              <StatusBadge status={myAttendance.todayStatus} />
            </div>
          </div>
        )}

        {/* Attendance stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Attendance Rate"
            value={`${myAttendance?.attendanceRate ?? 0}%`}
            icon={<Icons.Trend />}
            color="blue"
            subtitle="Last 30 days"
          />
          <StatCard
            title="Days Present"
            value={myAttendance?.present ?? 0}
            icon={<Icons.Check />}
            color="green"
          />
          <StatCard
            title="Days Late"
            value={myAttendance?.late ?? 0}
            icon={<Icons.Clock />}
            color="yellow"
          />
          <StatCard
            title="Days Absent"
            value={myAttendance?.absent ?? 0}
            icon={<Icons.X />}
            color="red"
          />
        </div>

        {/* Leave stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Pending Requests"
            value={myLeaves?.pending ?? 0}
            icon={<Icons.Clock />}
            color="yellow"
          />
          <StatCard
            title="Approved Leaves"
            value={myLeaves?.approved ?? 0}
            icon={<Icons.Check />}
            color="green"
          />
          <StatCard
            title="Rejected"
            value={myLeaves?.rejected ?? 0}
            icon={<Icons.X />}
            color="red"
          />
        </div>

        {/* Quick actions */}
        <QuickActions
          actions={[
            {
              label: "View Attendance",
              href: "/my-attendance",
              icon: "📅",
              color: "bg-blue-50 border-blue-100 hover:border-blue-300",
              description: "Check your attendance history",
            },
            {
              label: "Apply for Leave",
              href: "/leaves",
              icon: "📝",
              color: "bg-purple-50 border-purple-100 hover:border-purple-300",
              description: "Submit a leave request",
            },
            {
              label: "View Profile",
              href: "/account/profile",
              icon: "👤",
              color: "bg-green-50 border-green-100 hover:border-green-300",
              description: "View and edit your profile",
            },
            {
              label: "My Payslips",
              href: "/my-payslips",
              icon: "💰",
              color: "bg-yellow-50 border-yellow-100 hover:border-yellow-300",
              description: "Download your payslips",
            },
          ]}
        />

        {/* Recent attendance records */}
        {myAttendance?.recentRecords.length ? (
          <div className="stat-card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-primary-border)]">
              <h3 className="font-semibold text-[var(--color-text)]">
                Recent Attendance
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--color-primary-light)] text-left">
                    {["Date", "Status", "Check In", "Check Out"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-primary-border)]">
                  {myAttendance.recentRecords.map((r) => (
                    <tr
                      key={r.date}
                      className="hover:bg-[var(--color-primary-light)] transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-[var(--color-text)]">
                        {fmt(r.date)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {r.checkIn
                          ? new Date(r.checkIn).toLocaleTimeString("en", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {r.checkOut
                          ? new Date(r.checkOut).toLocaleTimeString("en", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* My leave requests */}
        {myLeaves?.recent.length ? (
          <div className="stat-card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-primary-border)]">
              <h3 className="font-semibold text-[var(--color-text)]">
                My Leave Requests
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--color-primary-light)] text-left">
                    {["Type", "Period", "Days", "Status", "Reason"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-primary-border)]">
                  {myLeaves.recent.map((l) => (
                    <tr
                      key={l.id}
                      className="hover:bg-[var(--color-primary-light)] transition-colors"
                    >
                      <td className="px-4 py-3 capitalize font-medium text-[var(--color-text)]">
                        {l.leaveType}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)] whitespace-nowrap">
                        {fmt(l.startDate)} – {fmt(l.endDate)}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold">
                        {l.totalDays}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={l.status} />
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)] max-w-[180px] truncate">
                        {l.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // ── ADMIN / HR dashboard ───────────────────────────────────────────────────
  const d = data as OrgData;
  const isAdmin = d.role === "admin";

  return (
    <div className="space-y-6">
      {/* Row 1 — Employee stats */}
      <div>
        <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
          Workforce Overview
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Employees"
            value={d.employees.total}
            icon={<Icons.Users />}
            color="blue"
          />
          <StatCard
            title="Active"
            value={d.employees.active}
            icon={<Icons.Check />}
            color="green"
          />
          <StatCard
            title="Inactive"
            value={d.employees.inactive}
            icon={<Icons.X />}
            color="red"
          />
          <StatCard
            title="On Leave"
            value={d.employees.onLeave}
            icon={<Icons.Cal />}
            color="purple"
          />
          <StatCard
            title="New This Month"
            value={d.employees.newHires}
            icon={<Icons.Add />}
            color="yellow"
            subtitle="Current month"
          />
        </div>
      </div>

      {/* Row 2 — Today's attendance */}
      <div>
        <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
          Today's Attendance
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            title="Attendance Rate"
            value={`${d.todayAttendance.attendanceRate}%`}
            icon={<Icons.Trend />}
            color="blue"
            subtitle={`${d.todayAttendance.activeTotal} expected`}
          />
          <StatCard
            title="Present"
            value={d.todayAttendance.present}
            icon={<Icons.Check />}
            color="green"
          />
          <StatCard
            title="Late Arrivals"
            value={d.todayAttendance.late}
            icon={<Icons.Clock />}
            color="yellow"
          />
          <StatCard
            title="Absent"
            value={d.todayAttendance.absent}
            icon={<Icons.X />}
            color="red"
          />
          <StatCard
            title="On Leave Today"
            value={d.todayAttendance.onLeave}
            icon={<Icons.Cal />}
            color="purple"
          />
        </div>
      </div>

      {/* Row 3 — Leave stats */}
      <div>
        <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
          Leave Summary
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Pending Requests"
            value={d.leaveSummary.pending}
            icon={<Icons.Clock />}
            color="yellow"
          />
          <StatCard
            title="Approved"
            value={d.leaveSummary.approved}
            icon={<Icons.Check />}
            color="green"
          />
          <StatCard
            title="Rejected"
            value={d.leaveSummary.rejected}
            icon={<Icons.X />}
            color="red"
          />
          <StatCard
            title="Currently on Leave"
            value={d.leaveSummary.activeLeave}
            icon={<Icons.Cal />}
            color="purple"
          />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttendanceChart
          data={d.trend}
          onRangeChange={handleRangeChange}
          loading={chartLoading}
        />
        <DepartmentChart data={d.departments} />
      </div>

      {/* Pending leaves table */}
      <PendingLeavesTable
        leaves={d.pendingLeaves}
        canReview={isAdmin || d.role === "hr"}
        onAction={handleLeaveAction}
      />

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecentActivity items={d.activity} />
        <UpcomingEvents events={d.events} />
        <QuickActions
          actions={[
            ...(isAdmin
              ? [
                  {
                    label: "Manage Users",
                    href: "/admin/dashboard#users",
                    icon: "👥",
                    color:
                      "bg-purple-50 border-purple-100 hover:border-purple-300",
                    description: "View all user accounts",
                  },
                ]
              : []),
            {
              label: "Employees",
              href: "/employees",
              icon: "👤",
              color: "bg-blue-50 border-blue-100 hover:border-blue-300",
              description: "Manage employee records",
            },
            {
              label: "Departments",
              href: "/departments",
              icon: "🏢",
              color: "bg-green-50 border-green-100 hover:border-green-300",
              description: "Manage departments",
            },
            {
              label: "Attendance",
              href: "/attendance",
              icon: "📋",
              color: "bg-purple-50 border-purple-100 hover:border-purple-300",
              description: "View attendance records",
            },
            {
              label: "Leave Requests",
              href: "/leaves",
              icon: "📅",
              color: "bg-yellow-50 border-yellow-100 hover:border-yellow-300",
              description: "Review pending requests",
            },
            {
              label: "Payroll",
              href: "/payroll",
              icon: "💰",
              color: "bg-indigo-50 border-indigo-100 hover:border-indigo-300",
              description: "Run payroll & payslips",
            },
            {
              label: "Recruitment",
              href: "/recruitment",
              icon: "🧑‍💼",
              color: "bg-teal-50 border-teal-100 hover:border-teal-300",
              description: "Jobs & candidates",
            },
            {
              label: "Reports",
              href: "/reports",
              icon: "📊",
              color: "bg-gray-50 border-gray-100 hover:border-gray-300",
              description: "Analytics & exports",
            },
          ]}
        />
      </div>
    </div>
  );
}
