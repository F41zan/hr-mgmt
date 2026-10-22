/**
 * PATCH  /api/payroll/payslips/[id]  { action: "publish" | "unpublish" } (payroll.manage)
 * DELETE /api/payroll/payslips/[id]  — delete a draft (payroll.manage)
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { apiGuard } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { notifyEmployee } from "@/lib/notify";
import Payslip from "@/lib/models/Payslip";
import { formatMonth } from "@/lib/utils/dates";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await apiGuard(PERMISSIONS.PAYROLL_MANAGE);
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Invalid ID." }, { status: 400 });

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (body.action !== "publish" && body.action !== "unpublish")
    return NextResponse.json({ error: "Action must be 'publish' or 'unpublish'." }, { status: 400 });

  await connectDB();
  const payslip = await Payslip.findById(id);
  if (!payslip) return NextResponse.json({ error: "Payslip not found." }, { status: 404 });

  if (body.action === "publish") {
    if (payslip.status === "published")
      return NextResponse.json({ error: "Payslip is already published." }, { status: 409 });
    payslip.status = "published";
    payslip.publishedAt = new Date();
    payslip.publishedBy = new mongoose.Types.ObjectId(guard.session.userId);
  } else {
    if (payslip.status === "draft")
      return NextResponse.json({ error: "Payslip is already a draft." }, { status: 409 });
    payslip.status = "draft";
    payslip.publishedAt = undefined;
    payslip.publishedBy = undefined;
  }
  await payslip.save();

  if (body.action === "publish")
    await notifyEmployee(payslip.employeeId, {
      type: "payslip",
      title: "Payslip available",
      message: `Your payslip for ${formatMonth(payslip.month)} is now available to view and download.`,
      link: "/my-payslips",
      email: true,
    });

  await logAudit({
    session: guard.session,
    req,
    action: `payroll.${body.action}`,
    entity: "Payslip",
    entityId: id,
    summary: `Payslip ${payslip.month} for ${payslip.employee.name} ${body.action === "publish" ? "published" : "reverted to draft"}`,
  });

  return NextResponse.json({ success: true, status: payslip.status });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await apiGuard(PERMISSIONS.PAYROLL_MANAGE);
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Invalid ID." }, { status: 400 });

  await connectDB();
  const payslip = await Payslip.findById(id);
  if (!payslip) return NextResponse.json({ error: "Payslip not found." }, { status: 404 });
  if (payslip.status !== "draft")
    return NextResponse.json({ error: "Only draft payslips can be deleted. Unpublish it first." }, { status: 409 });

  await payslip.deleteOne();
  await logAudit({
    session: guard.session,
    req,
    action: "payroll.delete",
    entity: "Payslip",
    entityId: id,
    summary: `Draft payslip ${payslip.month} for ${payslip.employee.name} deleted`,
  });

  return NextResponse.json({ success: true });
}
