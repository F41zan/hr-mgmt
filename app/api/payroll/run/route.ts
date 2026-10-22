/**
 * POST /api/payroll/run  { month: "YYYY-MM", employeeIds?: string[] }
 * Generates draft payslips. Published payslips are left untouched.
 * Requires payroll.manage.
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { apiGuard } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { generatePayroll } from "@/lib/payrollService";
import { MONTH_RE, currentMonth } from "@/lib/utils/dates";

const runSchema = z.object({
  month: z.string().regex(MONTH_RE, "Month must be YYYY-MM"),
  employeeIds: z
    .array(z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), "Invalid employee ID"))
    .optional(),
});

export async function POST(req: NextRequest) {
  const guard = await apiGuard(PERMISSIONS.PAYROLL_MANAGE);
  if (guard instanceof NextResponse) return guard;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = runSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );

  const { month, employeeIds } = parsed.data;
  if (month > currentMonth())
    return NextResponse.json({ error: "Payroll cannot be run for a future month." }, { status: 400 });

  try {
    const result = await generatePayroll(month, guard.session.userId, employeeIds);
    await logAudit({
      session: guard.session,
      req,
      action: "payroll.run",
      entity: "Payslip",
      summary: `Payroll run for ${month}: ${result.generated} draft payslip(s) generated`,
      details: { ...result },
    });
    return NextResponse.json({ message: "Payroll generated.", ...result });
  } catch (err) {
    console.error("[payroll/run]", (err as Error).message);
    return NextResponse.json({ error: "Failed to run payroll." }, { status: 500 });
  }
}
