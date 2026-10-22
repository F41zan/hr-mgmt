/**
 * lib/dashboardService.ts
 * Server-side aggregation for all dashboard data.
 * All functions run server-side only; never trust client-supplied role/userId.
 */

import "server-only";
import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import Attendance from "@/lib/models/Attendance";
import Leave from "@/lib/models/Leave";

// ── helpers ────────────────────────────────────────────────────────────────────

/** Midnight UTC for a given date */
function dayStart(d: Date): Date {
  const r = new Date(d);
  r.setUTCHours(0, 0, 0, 0);
  return r;
}
function dayEnd(d: Date): Date {
  const r = new Date(d);
  r.setUTCHours(23, 59, 59, 999);
  return r;
}

// ── Employee summary ───────────────────────────────────────────────────────────

export async function getEmployeeSummary() {
  await connectDB();
  const [total, active, inactive, onLeave, newHires] = await Promise.all([
    Employee.countDocuments(),
    Employee.countDocuments({ status: "active" }),
    Employee.countDocuments({ status: { $in: ["inactive", "terminated"] } }),
    Employee.countDocuments({ status: "on_leave" }),
    Employee.countDocuments({
      joiningDate: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    }),
  ]);
  return { total, active, inactive, onLeave, newHires };
}

// ── Today's attendance summary ─────────────────────────────────────────────────

export async function getTodayAttendance() {
  await connectDB();
  const today = dayStart(new Date());
  const todayEnd = dayEnd(new Date());

  const records = await Attendance.find({
    date: { $gte: today, $lte: todayEnd },
  }).lean();

  const present = records.filter((r) => r.status === "present").length;
  const late = records.filter((r) => r.status === "late").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const onLeave = records.filter((r) => r.status === "on_leave").length;
  const activeTotal = await Employee.countDocuments({
    status: { $in: ["active", "on_leave"] },
  });
  const attendanceRate =
    activeTotal > 0 ? Math.round(((present + late) / activeTotal) * 100) : 0;

  return {
    present,
    late,
    absent,
    onLeave,
    total: records.length,
    attendanceRate,
    activeTotal,
  };
}

// ── Attendance trend (last N days) ────────────────────────────────────────────

export async function getAttendanceTrend(days = 7) {
  await connectDB();
  const end = dayEnd(new Date());
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  dayStart(start);

  const records = await Attendance.find({
    date: { $gte: start, $lte: end },
  }).lean();

  // Build day buckets
  const buckets: Record<
    string,
    {
      date: string;
      present: number;
      absent: number;
      late: number;
      on_leave: number;
    }
  > = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = { date: key, present: 0, absent: 0, late: 0, on_leave: 0 };
  }

  for (const r of records) {
    const key = new Date(r.date).toISOString().slice(0, 10);
    if (buckets[key]) {
      const s = r.status as keyof (typeof buckets)[string];
      if (s in buckets[key]) (buckets[key] as Record<string, number>)[s]++;
    }
  }

  return Object.values(buckets);
}

// ── Leave summary ──────────────────────────────────────────────────────────────

export async function getLeaveSummary() {
  await connectDB();
  const now = new Date();
  const [pending, approved, rejected, activeLeave] = await Promise.all([
    Leave.countDocuments({ status: "pending" }),
    Leave.countDocuments({ status: "approved" }),
    Leave.countDocuments({ status: "rejected" }),
    Leave.countDocuments({
      status: "approved",
      startDate: { $lte: now },
      endDate: { $gte: now },
    }),
  ]);
  return {
    pending,
    approved,
    rejected,
    activeLeave,
    total: pending + approved + rejected,
  };
}

// ── Pending leave requests (for admin/hr) ─────────────────────────────────────

export async function getPendingLeaves(limit = 10) {
  await connectDB();
  const leaves = await Leave.find({ status: "pending" })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate<{
      employeeId: { name: string; employeeId: string; department: string };
    }>("employeeId", "name employeeId department")
    .lean();

  return leaves.map((l) => ({
    id: l._id.toString(),
    employee: l.employeeId
      ? {
          name: (l.employeeId as { name: string }).name,
          employeeId: (l.employeeId as { employeeId: string }).employeeId,
          department: (l.employeeId as { department: string }).department,
        }
      : { name: "Unknown", employeeId: "—", department: "—" },
    leaveType: l.leaveType,
    startDate: l.startDate.toISOString(),
    endDate: l.endDate.toISOString(),
    totalDays: l.totalDays,
    reason: l.reason,
    status: l.status,
    submittedAt: l.createdAt.toISOString(),
  }));
}

// ── Department distribution ────────────────────────────────────────────────────

export async function getDepartmentDistribution() {
  await connectDB();
  const result = await Employee.aggregate([
    { $match: { status: "active" } },
    { $group: { _id: "$department", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return result.map((r) => ({
    department: r._id as string,
    count: r.count as number,
  }));
}

// ── Recent activity (last 20 leave + user events) ─────────────────────────────

export async function getRecentActivity(limit = 10) {
  await connectDB();
  const recentLeaves = await Leave.find()
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate<{ employeeId: { name: string } }>("employeeId", "name")
    .lean();

  return recentLeaves.map((l) => {
    const empName = l.employeeId
      ? (l.employeeId as { name: string }).name
      : "Unknown";
    let description = "";
    if (l.status === "pending")
      description = `${empName} submitted a ${l.leaveType} leave request`;
    else if (l.status === "approved")
      description = `${empName}'s ${l.leaveType} leave was approved`;
    else description = `${empName}'s ${l.leaveType} leave was rejected`;

    return {
      id: l._id.toString(),
      description,
      timestamp: l.updatedAt.toISOString(),
      type: l.status,
    };
  });
}

// ── Upcoming birthdays & anniversaries ────────────────────────────────────────

export async function getUpcomingEvents(days = 30) {
  await connectDB();
  const now = new Date();
  const y = now.getFullYear();

  const employees = await Employee.find({ status: "active" })
    .select("name dateOfBirth joiningDate")
    .lean();

  const events: {
    name: string;
    type: string;
    date: string;
    daysAway: number;
  }[] = [];

  for (const emp of employees) {
    if (emp.dateOfBirth) {
      const bday = new Date(emp.dateOfBirth);
      const thisYear = new Date(y, bday.getMonth(), bday.getDate());
      const diff = Math.ceil((thisYear.getTime() - now.getTime()) / 86400000);
      if (diff >= 0 && diff <= days) {
        events.push({
          name: emp.name,
          type: "birthday",
          date: thisYear.toISOString(),
          daysAway: diff,
        });
      }
    }
    if (emp.joiningDate) {
      const join = new Date(emp.joiningDate);
      const anniv = new Date(y, join.getMonth(), join.getDate());
      const diff = Math.ceil((anniv.getTime() - now.getTime()) / 86400000);
      const years = y - join.getFullYear();
      if (diff >= 0 && diff <= days && years > 0) {
        events.push({
          name: emp.name,
          type: `work anniversary (${years}yr)`,
          date: anniv.toISOString(),
          daysAway: diff,
        });
      }
    }
  }

  return events.sort((a, b) => a.daysAway - b.daysAway).slice(0, 10);
}

// ── Employee-specific data (for employee dashboard) ────────────────────────────

export async function getMyAttendance(userId: string, days = 30) {
  await connectDB();
  const emp = await Employee.findOne({ userId }).lean();
  if (!emp) return null;

  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);

  const records = await Attendance.find({
    employeeId: emp._id,
    date: { $gte: start },
  })
    .sort({ date: -1 })
    .lean();

  const today = records.find((r) => {
    const d = new Date(r.date);
    const n = new Date();
    return (
      d.getUTCFullYear() === n.getFullYear() &&
      d.getUTCMonth() === n.getMonth() &&
      d.getUTCDate() === n.getDate()
    );
  });

  const present = records.filter((r) => r.status === "present").length;
  const late = records.filter((r) => r.status === "late").length;
  const absent = records.filter((r) => r.status === "absent").length;

  return {
    employee: {
      name: emp.name,
      employeeId: emp.employeeId,
      department: emp.department,
      designation: emp.designation,
    },
    todayStatus: today?.status ?? "not_recorded",
    present,
    late,
    absent,
    total: records.length,
    attendanceRate:
      records.length > 0
        ? Math.round(((present + late) / records.length) * 100)
        : 0,
    recentRecords: records.slice(0, 10).map((r) => ({
      date: new Date(r.date).toISOString(),
      status: r.status,
      checkIn: r.checkIn?.toISOString(),
      checkOut: r.checkOut?.toISOString(),
    })),
  };
}

export async function getMyLeaves(userId: string) {
  await connectDB();
  const emp = await Employee.findOne({ userId }).lean();
  if (!emp) return null;

  const leaves = await Leave.find({ employeeId: emp._id })
    .sort({ createdAt: -1 })
    .lean();

  const pending = leaves.filter((l) => l.status === "pending").length;
  const approved = leaves.filter((l) => l.status === "approved").length;
  const rejected = leaves.filter((l) => l.status === "rejected").length;

  return {
    pending,
    approved,
    rejected,
    total: leaves.length,
    recent: leaves.slice(0, 5).map((l) => ({
      id: l._id.toString(),
      leaveType: l.leaveType,
      startDate: l.startDate.toISOString(),
      endDate: l.endDate.toISOString(),
      totalDays: l.totalDays,
      status: l.status,
      reason: l.reason,
    })),
  };
}
