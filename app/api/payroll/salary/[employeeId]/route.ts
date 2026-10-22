/**
 * GET /api/payroll/salary/[employeeId] — Salary structure for one employee
 * PUT /api/payroll/salary/[employeeId] — Create or replace it
 * Requires payroll.manage.
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { apiGuard } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import Employee from "@/lib/models/Employee";
import SalaryStructure from "@/lib/models/SalaryStructure";
import { isValidDateString } from "@/lib/utils/dates";
import { parseAttendanceDate } from "@/lib/utils/attendance";

type Params = { params: Promise<{ employeeId: string }> };

const amount = z.coerce.number().min(0).max(100_000_000);
const percent = z.coerce.number().min(0).max(100);

const salarySchema = z.object({
  basic: amount.refine((v) => v > 0, "Basic salary must be greater than 0"),
  hra: amount.default(0),
  specialAllowance: amount.default(0),
  otherAllowances: amount.default(0),
  pfPercent: percent.default(12),
  professionalTax: amount.default(200),
  tdsPercent: percent.default(0),
  otherDeductions: amount.default(0),
  effectiveFrom: z.string().refine(isValidDateString, "Invalid date").optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await apiGuard(PERMISSIONS.PAYROLL_MANAGE);
  if (guard instanceof NextResponse) return guard;

  const { employeeId } = await params;
  if (!mongoose.Types.ObjectId.isValid(employeeId))
    return NextResponse.json({ error: "Invalid employee ID." }, { status: 400 });

  await connectDB();
  const salary = await SalaryStructure.findOne({ employeeId }).lean();
  return NextResponse.json({ salary });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await apiGuard(PERMISSIONS.PAYROLL_MANAGE);
  if (guard instanceof NextResponse) return guard;

  const { employeeId } = await params;
  if (!mongoose.Types.ObjectId.isValid(employeeId))
    return NextResponse.json({ error: "Invalid employee ID." }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = salarySchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );

  try {
    await connectDB();
    const emp = await Employee.findById(employeeId).select("firstName lastName employeeId").lean();
    if (!emp) return NextResponse.json({ error: "Employee not found." }, { status: 404 });

    const { effectiveFrom, ...values } = parsed.data;
    const previous = await SalaryStructure.findOne({ employeeId }).lean();
    const salary = await SalaryStructure.findOneAndUpdate(
      { employeeId },
      {
        $set: {
          ...values,
          effectiveFrom: effectiveFrom ? parseAttendanceDate(effectiveFrom) : new Date(),
          updatedBy: new mongoose.Types.ObjectId(guard.session.userId),
        },
      },
      { upsert: true, new: true, runValidators: true },
    ).lean();

    await logAudit({
      session: guard.session,
      req,
      action: previous ? "payroll.salary_update" : "payroll.salary_create",
      entity: "SalaryStructure",
      entityId: employeeId,
      summary: `Salary structure ${previous ? "updated" : "created"} for ${emp.firstName} ${emp.lastName} (${emp.employeeId})`,
      details: previous
        ? { previousBasic: previous.basic, newBasic: values.basic }
        : { basic: values.basic },
    });

    return NextResponse.json({ message: "Salary structure saved.", salary });
  } catch (err) {
    console.error("[payroll/salary PUT]", (err as Error).message);
    return NextResponse.json({ error: "Failed to save salary structure." }, { status: 500 });
  }
}
