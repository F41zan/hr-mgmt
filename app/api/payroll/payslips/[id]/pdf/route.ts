/**
 * GET /api/payroll/payslips/[id]/pdf[?download=1]
 * payroll.manage holders: any payslip (drafts are watermarked).
 * Everyone else: only their own published payslips.
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { apiGuard } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import Payslip from "@/lib/models/Payslip";
import { getOwnEmployee } from "@/lib/leaveService";
import { renderPayslipPdf } from "@/lib/payslipPdf";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const guard = await apiGuard();
  if (guard instanceof NextResponse) return guard;
  const { session, can } = guard;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Invalid ID." }, { status: 400 });

  await connectDB();
  const payslip = await Payslip.findById(id).lean();
  if (!payslip) return NextResponse.json({ error: "Payslip not found." }, { status: 404 });

  if (!can(PERMISSIONS.PAYROLL_MANAGE)) {
    const own = await getOwnEmployee(session);
    if (!own || !own._id.equals(payslip.employeeId) || payslip.status !== "published")
      return NextResponse.json({ error: "Payslip not found." }, { status: 404 });
  }

  const pdf = renderPayslipPdf(payslip);
  const filename = `payslip-${payslip.employee.code}-${payslip.month}.pdf`;
  const disposition = req.nextUrl.searchParams.get("download") ? "attachment" : "inline";

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
