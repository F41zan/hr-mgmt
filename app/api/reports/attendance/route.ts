/**
 * GET /api/reports/attendance?month=YYYY-MM[&departmentId=][&format=csv]
 * Per-employee monthly attendance summary + daily totals. Requires reports.view.
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { apiGuard } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import Attendance from "@/lib/models/Attendance";
import Employee from "@/lib/models/Employee";
import "@/lib/models/Department";
import { parseAttendanceDate } from "@/lib/utils/attendance";
import { MONTH_RE, currentMonth, monthRange, toDateString, workingDaysBetween } from "@/lib/utils/dates";
import { toCsv } from "@/lib/utils/csv";

export async function GET(req: NextRequest) {
  const guard = await apiGuard(PERMISSIONS.REPORTS_VIEW);
  if (guard instanceof NextResponse) return guard;

  const sp = req.nextUrl.searchParams;
  const month = sp.get("month") || currentMonth();
  if (!MONTH_RE.test(month)) return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  const departmentId = sp.get("departmentId");

  try {
    await connectDB();
    const { start, end } = monthRange(month);
    const today = toDateString(new Date());
    const workingDays = workingDaysBetween(start, end < today ? end : today).length;

    const empQuery: Record<string, unknown> = { status: { $ne: "terminated" } };
    if (departmentId && mongoose.Types.ObjectId.isValid(departmentId))
      empQuery.departmentId = new mongoose.Types.ObjectId(departmentId);
    const employees = await Employee.find(empQuery)
      .select("employeeId firstName lastName departmentId")
      .populate<{ departmentId: { name: string } | null }>("departmentId", "name")
      .sort({ employeeId: 1 })
      .lean();

    const records = await Attendance.find({
      employeeId: { $in: employees.map((e) => e._id) },
      attendanceDate: { $gte: parseAttendanceDate(start), $lte: parseAttendanceDate(end) },
    })
      .select("employeeId attendanceDate status isLate workingDurationMinutes isEarlyDeparture")
      .lean();

    const byEmp = new Map<string, typeof records>();
    const daily = new Map<string, { present: number; absent: number; halfDay: number; onLeave: number; late: number }>();
    for (const r of records) {
      const k = r.employeeId.toString();
      if (!byEmp.has(k)) byEmp.set(k, []);
      byEmp.get(k)!.push(r);

      const d = toDateString(r.attendanceDate);
      const day = daily.get(d) ?? { present: 0, absent: 0, halfDay: 0, onLeave: 0, late: 0 };
      if (r.status === "present") day.present++;
      else if (r.status === "absent") day.absent++;
      else if (r.status === "half-day") day.halfDay++;
      else if (r.status === "on-leave") day.onLeave++;
      if (r.isLate) day.late++;
      daily.set(d, day);
    }

    const rows = employees.map((e) => {
      const recs = byEmp.get(e._id.toString()) ?? [];
      const present = recs.filter((r) => r.status === "present").length;
      const halfDay = recs.filter((r) => r.status === "half-day").length;
      const worked = recs.filter((r) => r.workingDurationMinutes);
      const totalMinutes = worked.reduce((s, r) => s + (r.workingDurationMinutes ?? 0), 0);
      return {
        id: e._id.toString(),
        employeeId: e.employeeId,
        name: `${e.firstName} ${e.lastName}`,
        department: e.departmentId?.name ?? "—",
        present,
        halfDay,
        absent: recs.filter((r) => r.status === "absent").length,
        onLeave: recs.filter((r) => r.status === "on-leave").length,
        late: recs.filter((r) => r.isLate).length,
        earlyDepartures: recs.filter((r) => r.isEarlyDeparture).length,
        avgHours: worked.length ? Math.round((totalMinutes / worked.length / 60) * 10) / 10 : 0,
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        attendanceRate: workingDays ? Math.round(((present + halfDay * 0.5) / workingDays) * 1000) / 10 : 0,
      };
    });

    if (sp.get("format") === "csv") {
      const csv = toCsv(
        ["Employee ID", "Name", "Department", "Present", "Half Day", "Absent", "On Leave", "Late", "Early Departures", "Avg Hours", "Total Hours", "Attendance %"],
        rows.map((r) => [r.employeeId, r.name, r.department, r.present, r.halfDay, r.absent, r.onLeave, r.late, r.earlyDepartures, r.avgHours, r.totalHours, r.attendanceRate]),
      );
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="attendance-report-${month}.csv"`,
        },
      });
    }

    const totals = rows.reduce(
      (t, r) => ({
        present: t.present + r.present,
        absent: t.absent + r.absent,
        halfDay: t.halfDay + r.halfDay,
        onLeave: t.onLeave + r.onLeave,
        late: t.late + r.late,
      }),
      { present: 0, absent: 0, halfDay: 0, onLeave: 0, late: 0 },
    );
    const avgRate = rows.length ? Math.round((rows.reduce((s, r) => s + r.attendanceRate, 0) / rows.length) * 10) / 10 : 0;

    return NextResponse.json({
      month,
      workingDays,
      totals: { ...totals, employees: rows.length, avgAttendanceRate: avgRate },
      daily: [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v })),
      rows,
    });
  } catch (err) {
    console.error("[reports/attendance]", (err as Error).message);
    return NextResponse.json({ error: "Failed to build attendance report." }, { status: 500 });
  }
}
