/**
 * lib/dashboardService.ts
 * Server-side aggregation for all dashboard data.
 * All functions run server-side only; never trust client-supplied role/userId.
 *
 * Attendance model notes: records are keyed by `attendanceDate` (business-day
 * midnight, see lib/utils/attendance.ts); lateness is the `isLate` flag on a
 * "present"/"half-day" record. The dashboard UI still uses the older status
 * vocabulary (late / on_leave / half_day), so records are mapped to it here.
 */

import "server-only";
import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import Attendance, { type IAttendance } from "@/lib/models/Attendance";
import Leave from "@/lib/models/Leave";
import "@/lib/models/Department";
import "@/lib/models/Designation";
import {
  getCanonicalAttendanceDate,
  parseAttendanceDate,
} from "@/lib/utils/attendance";
import { toDateString } from "@/lib/utils/dates";

// ── helpers ────────────────────────────────────────────────────────────────────

type PopulatedEmployee = {
  firstName: string;
  lastName: string;
  employeeId: string;
  departmentId?: { name: string } | null;
};

const fullName = (e: { firstName: string; lastName: string }) =>
  `${e.firstName} ${e.lastName}`;

/** "YYYY-MM-DD" business date `offset` days from today. */
function businessDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return getCanonicalAttendanceDate(d);
}

/** Map a record to the dashboard's status vocabulary. */
function dashboardStatus(
  r: Pick<IAttendance, "status" | "isLate">,
): "present" | "late" | "absent" | "on_leave" | "half_day" {
  if (r.status === "on-leave") return "on_leave";
  if (r.status === "absent") return "absent";
  if (r.isLate) return "late";
  if (r.status === "half-day") return "half_day";
  return "present";
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
  const records = await Attendance.find({
    attendanceDate: parseAttendanceDate(businessDate()),
  })
    .select("status isLate")
    .lean();

  const statuses = records.map(dashboardStatus);
  const late = statuses.filter((s) => s === "late").length;
  // Half days count as attended
  const present = statuses.filter(
    (s) => s === "present" || s === "half_day",
  ).length;
  const absent = statuses.filter((s) => s === "absent").length;
  const onLeave = statuses.filter((s) => s === "on_leave").length;
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
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) keys.push(businessDate(-i));

  const records = await Attendance.find({
    attendanceDate: {
      $gte: parseAttendanceDate(keys[0]),
      $lte: parseAttendanceDate(keys[keys.length - 1]),
    },
  })
    .select("attendanceDate status isLate")
    .lean();

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
  for (const key of keys)
    buckets[key] = { date: key, present: 0, absent: 0, late: 0, on_leave: 0 };

  for (const r of records) {
    const bucket = buckets[toDateString(r.attendanceDate)];
    if (!bucket) continue;
    const s = dashboardStatus(r);
    if (s === "half_day") bucket.present++;
    else bucket[s]++;
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
    .populate<{ employeeId: PopulatedEmployee | null }>({
      path: "employeeId",
      select: "firstName lastName employeeId departmentId",
      populate: { path: "departmentId", select: "name" },
    })
    .lean();

  return leaves.map((l) => ({
    id: l._id.toString(),
    employee: l.employeeId
      ? {
          name: fullName(l.employeeId),
          employeeId: l.employeeId.employeeId,
          department: l.employeeId.departmentId?.name ?? "—",
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
  const result = await Employee.aggregate<{ _id: string | null; count: number }>([
    { $match: { status: "active" } },
    { $group: { _id: "$departmentId", count: { $sum: 1 } } },
    {
      $lookup: {
        from: "departments",
        localField: "_id",
        foreignField: "_id",
        as: "dept",
      },
    },
    {
      $project: {
        _id: { $ifNull: [{ $first: "$dept.name" }, "Unassigned"] },
        count: 1,
      },
    },
    { $sort: { count: -1 } },
  ]);
  return result.map((r) => ({
    department: r._id ?? "Unassigned",
    count: r.count,
  }));
}

// ── Recent activity (latest leave events) ─────────────────────────────────────

export async function getRecentActivity(limit = 10) {
  await connectDB();
  const recentLeaves = await Leave.find()
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate<{ employeeId: PopulatedEmployee | null }>(
      "employeeId",
      "firstName lastName",
    )
    .lean();

  return recentLeaves.map((l) => {
    const empName = l.employeeId ? fullName(l.employeeId) : "Unknown";
    let description = "";
    if (l.status === "pending")
      description = `${empName} submitted a ${l.leaveType} leave request`;
    else if (l.status === "approved")
      description = `${empName}'s ${l.leaveType} leave was approved`;
    else if (l.status === "cancelled")
      description = `${empName} cancelled a ${l.leaveType} leave request`;
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
    .select("firstName lastName dateOfBirth joiningDate")
    .lean();

  const events: {
    name: string;
    type: string;
    date: string;
    daysAway: number;
  }[] = [];

  for (const emp of employees) {
    const name = fullName(emp);
    if (emp.dateOfBirth) {
      const bday = new Date(emp.dateOfBirth);
      const thisYear = new Date(y, bday.getMonth(), bday.getDate());
      const diff = Math.ceil((thisYear.getTime() - now.getTime()) / 86400000);
      if (diff >= 0 && diff <= days) {
        events.push({
          name,
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
          name,
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
  const emp = await Employee.findOne({ userId })
    .populate<{ departmentId: { name: string } | null }>("departmentId", "name")
    .populate<{ designationId: { name: string } | null }>(
      "designationId",
      "name",
    )
    .lean();
  if (!emp) return null;

  const records = await Attendance.find({
    employeeId: emp._id,
    attendanceDate: { $gte: parseAttendanceDate(businessDate(-(days - 1))) },
  })
    .sort({ attendanceDate: -1 })
    .lean();

  const todayKey = businessDate();
  const today = records.find((r) => toDateString(r.attendanceDate) === todayKey);

  const statuses = records.map(dashboardStatus);
  const present = statuses.filter(
    (s) => s === "present" || s === "half_day",
  ).length;
  const late = statuses.filter((s) => s === "late").length;
  const absent = statuses.filter((s) => s === "absent").length;

  return {
    employee: {
      name: fullName(emp),
      employeeId: emp.employeeId,
      department: emp.departmentId?.name ?? "—",
      designation: emp.designationId?.name ?? "—",
    },
    todayStatus: today ? dashboardStatus(today) : "not_recorded",
    present,
    late,
    absent,
    total: records.length,
    attendanceRate:
      records.length > 0
        ? Math.round(((present + late) / records.length) * 100)
        : 0,
    recentRecords: records.slice(0, 10).map((r) => ({
      date: r.attendanceDate.toISOString(),
      status: dashboardStatus(r),
      checkIn: r.checkInAt?.toISOString(),
      checkOut: r.checkOutAt?.toISOString(),
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
