/**
 * GET /api/payroll/salary — Employees with their current salary structure.
 * Requires payroll.manage. Filters: search, departmentId, missing=true
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { apiGuard } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import Employee from "@/lib/models/Employee";
import "@/lib/models/Department";
import "@/lib/models/Designation";
import SalaryStructure from "@/lib/models/SalaryStructure";
import { monthlyGross } from "@/lib/utils/payroll";

export async function GET(req: NextRequest) {
  const guard = await apiGuard(PERMISSIONS.PAYROLL_MANAGE);
  if (guard instanceof NextResponse) return guard;

  try {
    await connectDB();
    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.trim();
    const departmentId = sp.get("departmentId");

    const query: Record<string, unknown> = { status: { $in: ["active", "on_leave"] } };
    if (departmentId && mongoose.Types.ObjectId.isValid(departmentId))
      query.departmentId = new mongoose.Types.ObjectId(departmentId);
    if (search) {
      const rx = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
      query.$or = [{ firstName: rx }, { lastName: rx }, { employeeId: rx }];
    }

    const employees = await Employee.find(query)
      .sort({ employeeId: 1 })
      .select("employeeId firstName lastName departmentId designationId joiningDate")
      .populate("departmentId", "name")
      .populate("designationId", "name")
      .lean();

    const structures = await SalaryStructure.find({
      employeeId: { $in: employees.map((e) => e._id) },
    }).lean();
    const byEmp = new Map(structures.map((s) => [s.employeeId.toString(), s]));

    let rows = employees.map((e) => {
      const s = byEmp.get(e._id.toString());
      return {
        employee: e,
        salary: s ?? null,
        monthlyGross: s ? monthlyGross(s) : 0,
      };
    });
    if (sp.get("missing") === "true") rows = rows.filter((r) => !r.salary);

    return NextResponse.json({ rows });
  } catch (err) {
    console.error("[payroll/salary GET]", (err as Error).message);
    return NextResponse.json({ error: "Failed to load salary records." }, { status: 500 });
  }
}
