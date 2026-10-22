/**
 * lib/payrollService.ts
 * Payroll generation (DB side). PDF rendering lives in lib/payslipPdf.ts.
 */

import "server-only";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import "@/lib/models/Department";
import "@/lib/models/Designation";
import Attendance from "@/lib/models/Attendance";
import Leave from "@/lib/models/Leave";
import SalaryStructure from "@/lib/models/SalaryStructure";
import Payslip from "@/lib/models/Payslip";
import { calculatePayroll } from "@/lib/utils/payroll";
import { parseAttendanceDate } from "@/lib/utils/attendance";
import { monthRange, toDateString, workingDaysBetween } from "@/lib/utils/dates";

/** LOP days from approved unpaid leave + absences/half-days within the month. */
async function getLopDays(
  employeeId: mongoose.Types.ObjectId,
  eligibleDates: Set<string>,
  monthStart: string,
  monthEnd: string,
): Promise<number> {
  const start = parseAttendanceDate(monthStart);
  const end = parseAttendanceDate(monthEnd);

  const [unpaid, attendance] = await Promise.all([
    Leave.find({
      employeeId,
      leaveType: "unpaid",
      status: "approved",
      startDate: { $lte: end },
      endDate: { $gte: start },
    }).lean(),
    Attendance.find({
      employeeId,
      attendanceDate: { $gte: start, $lte: end },
      status: { $in: ["absent", "half-day"] },
    })
      .select("attendanceDate status")
      .lean(),
  ]);

  const lop = new Map<string, number>();
  for (const l of unpaid) {
    for (const d of workingDaysBetween(toDateString(l.startDate), toDateString(l.endDate))) {
      if (eligibleDates.has(d)) lop.set(d, l.isHalfDay ? 0.5 : 1);
    }
  }
  for (const a of attendance) {
    const d = toDateString(a.attendanceDate);
    if (!eligibleDates.has(d)) continue;
    lop.set(d, Math.max(lop.get(d) ?? 0, a.status === "absent" ? 1 : 0.5));
  }
  return [...lop.values()].reduce((s, v) => s + v, 0);
}

export interface PayrollRunResult {
  generated: number;
  skippedPublished: string[];
  missingSalary: string[];
}

/**
 * Generate (or regenerate) draft payslips for a month.
 * Published payslips are never overwritten.
 */
export async function generatePayroll(
  month: string,
  generatedBy: string,
  employeeIds?: string[],
): Promise<PayrollRunResult> {
  await connectDB();
  const { start, end } = monthRange(month);
  const allWorkingDays = workingDaysBetween(start, end);

  const empQuery: Record<string, unknown> = {
    status: { $in: ["active", "on_leave"] },
    joiningDate: { $lte: parseAttendanceDate(end) },
  };
  if (employeeIds?.length)
    empQuery._id = { $in: employeeIds.map((id) => new mongoose.Types.ObjectId(id)) };

  const employees = await Employee.find(empQuery)
    .populate<{ departmentId: { name: string } | null }>("departmentId", "name")
    .populate<{ designationId: { name: string } | null }>("designationId", "name")
    .lean();

  const [structures, published] = await Promise.all([
    SalaryStructure.find({ employeeId: { $in: employees.map((e) => e._id) } }).lean(),
    Payslip.find({ month, status: "published", employeeId: { $in: employees.map((e) => e._id) } })
      .select("employeeId")
      .lean(),
  ]);
  const structureByEmp = new Map(structures.map((s) => [s.employeeId.toString(), s]));
  const publishedSet = new Set(published.map((p) => p.employeeId.toString()));

  const result: PayrollRunResult = { generated: 0, skippedPublished: [], missingSalary: [] };

  for (const emp of employees) {
    const name = `${emp.firstName} ${emp.lastName}`;
    const key = emp._id.toString();
    if (publishedSet.has(key)) {
      result.skippedPublished.push(name);
      continue;
    }
    const salary = structureByEmp.get(key);
    if (!salary) {
      result.missingSalary.push(name);
      continue;
    }

    const joined = toDateString(emp.joiningDate);
    const eligible = allWorkingDays.filter((d) => d >= joined);
    const lopDays = await getLopDays(emp._id, new Set(eligible), start, end);

    const calc = calculatePayroll(salary, {
      workingDays: allWorkingDays.length,
      eligibleDays: eligible.length,
      lopDays,
    });

    await Payslip.findOneAndUpdate(
      { employeeId: emp._id, month },
      {
        $set: {
          employee: {
            name,
            code: emp.employeeId,
            email: emp.email,
            department: emp.departmentId?.name,
            designation: emp.designationId?.name,
            joiningDate: emp.joiningDate,
          },
          ...calc,
          status: "draft",
          generatedBy: new mongoose.Types.ObjectId(generatedBy),
        },
      },
      { upsert: true, runValidators: true },
    );
    result.generated++;
  }

  return result;
}
