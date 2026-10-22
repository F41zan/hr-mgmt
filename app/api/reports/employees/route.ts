/**
 * GET /api/reports/employees[?format=csv]
 * Headcount statistics (status, department, type, gender, tenure, joiners/leavers).
 * CSV returns the employee directory. Requires reports.view.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { apiGuard } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import Employee from "@/lib/models/Employee";
import "@/lib/models/Department";
import "@/lib/models/Designation";
import { toCsv } from "@/lib/utils/csv";
import { toDateString } from "@/lib/utils/dates";

function countBy<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, number>();
  for (const i of items) map.set(key(i), (map.get(key(i)) ?? 0) + 1);
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

export async function GET(req: NextRequest) {
  const guard = await apiGuard(PERMISSIONS.REPORTS_VIEW);
  if (guard instanceof NextResponse) return guard;

  try {
    await connectDB();
    const employees = await Employee.find()
      .select("employeeId firstName lastName email phone status employmentType gender joiningDate departmentId designationId updatedAt workLocation")
      .populate<{ departmentId: { name: string } | null }>("departmentId", "name")
      .populate<{ designationId: { name: string } | null }>("designationId", "name")
      .sort({ employeeId: 1 })
      .lean();

    if (req.nextUrl.searchParams.get("format") === "csv") {
      const csv = toCsv(
        ["Employee ID", "Name", "Email", "Phone", "Department", "Designation", "Type", "Status", "Gender", "Joining Date", "Location"],
        employees.map((e) => [
          e.employeeId,
          `${e.firstName} ${e.lastName}`,
          e.email,
          e.phone,
          e.departmentId?.name,
          e.designationId?.name,
          e.employmentType,
          e.status,
          e.gender,
          toDateString(e.joiningDate),
          e.workLocation,
        ]),
      );
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="employee-directory.csv"`,
        },
      });
    }

    const current = employees.filter((e) => e.status === "active" || e.status === "on_leave");
    const now = Date.now();
    const yearMs = 365.25 * 24 * 3600 * 1000;

    const tenureBucket = (joined: Date) => {
      const yrs = (now - joined.getTime()) / yearMs;
      if (yrs < 1) return "< 1 year";
      if (yrs < 3) return "1–3 years";
      if (yrs < 5) return "3–5 years";
      return "5+ years";
    };

    // Joiners & leavers per month for the last 12 months
    const months: string[] = [];
    const d = new Date();
    for (let i = 11; i >= 0; i--) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      months.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`);
    }
    const trend = months.map((m) => ({
      month: m,
      joined: employees.filter((e) => toDateString(e.joiningDate).startsWith(m)).length,
      // Employee has no exit date, so last update while inactive/terminated approximates it
      left: employees.filter(
        (e) => (e.status === "inactive" || e.status === "terminated") && toDateString(e.updatedAt).startsWith(m),
      ).length,
    }));

    return NextResponse.json({
      totals: {
        total: employees.length,
        active: employees.filter((e) => e.status === "active").length,
        onLeave: employees.filter((e) => e.status === "on_leave").length,
        inactive: employees.filter((e) => e.status === "inactive").length,
        terminated: employees.filter((e) => e.status === "terminated").length,
        newThisMonth: trend[trend.length - 1].joined,
      },
      byDepartment: countBy(current, (e) => e.departmentId?.name ?? "Unassigned"),
      byType: countBy(current, (e) => e.employmentType),
      byGender: countBy(current, (e) => e.gender ?? "not specified"),
      byTenure: countBy(current, (e) => tenureBucket(e.joiningDate)),
      byStatus: countBy(employees, (e) => e.status),
      trend,
    });
  } catch (err) {
    console.error("[reports/employees]", (err as Error).message);
    return NextResponse.json({ error: "Failed to build employee report." }, { status: 500 });
  }
}
