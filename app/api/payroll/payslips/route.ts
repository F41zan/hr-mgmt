/**
 * GET   /api/payroll/payslips — payroll.manage: all payslips (filters: month, status, search)
 *                               others: own published payslips (?scope=mine forces this)
 * PATCH /api/payroll/payslips — Bulk publish drafts { month, action: "publish" } (payroll.manage)
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { apiGuard } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { notifyEmployee } from "@/lib/notify";
import Payslip from "@/lib/models/Payslip";
import { getOwnEmployee } from "@/lib/leaveService";
import { MONTH_RE, formatMonth } from "@/lib/utils/dates";

export async function GET(req: NextRequest) {
  const guard = await apiGuard();
  if (guard instanceof NextResponse) return guard;
  const { session, can } = guard;

  try {
    await connectDB();
    const sp = req.nextUrl.searchParams;
    const page = Math.max(parseInt(sp.get("page") || "1"), 1);
    const limit = Math.min(Math.max(parseInt(sp.get("limit") || "20"), 1), 100);
    const month = sp.get("month");
    const status = sp.get("status");
    const search = sp.get("search")?.trim();
    const mine = sp.get("scope") === "mine" || !can(PERMISSIONS.PAYROLL_MANAGE);

    const query: Record<string, unknown> = {};
    if (mine) {
      const own = await getOwnEmployee(session);
      if (!own)
        return NextResponse.json({ payslips: [], summary: null, pagination: { page, limit, total: 0, pages: 0 } });
      query.employeeId = own._id;
      query.status = "published";
    } else {
      if (status === "draft" || status === "published") query.status = status;
      if (search) {
        const rx = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
        query.$or = [{ "employee.name": rx }, { "employee.code": rx }];
      }
    }
    if (month && MONTH_RE.test(month)) query.month = month;

    const [total, payslips, totals] = await Promise.all([
      Payslip.countDocuments(query),
      Payslip.find(query)
        .sort({ month: -1, "employee.code": 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      mine
        ? Promise.resolve([])
        : Payslip.aggregate<{ gross: number; deductions: number; net: number; count: number; drafts: number }>([
            { $match: query },
            {
              $group: {
                _id: null,
                gross: { $sum: "$grossEarnings" },
                deductions: { $sum: "$totalDeductions" },
                net: { $sum: "$netPay" },
                count: { $sum: 1 },
                drafts: { $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] } },
              },
            },
          ]),
    ]);

    return NextResponse.json({
      payslips,
      summary: totals[0] ?? null,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[payslips GET]", (err as Error).message);
    return NextResponse.json({ error: "Failed to load payslips." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await apiGuard(PERMISSIONS.PAYROLL_MANAGE);
  if (guard instanceof NextResponse) return guard;

  let body: { month?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (body.action !== "publish" || !body.month || !MONTH_RE.test(body.month))
    return NextResponse.json({ error: "Expected { month: 'YYYY-MM', action: 'publish' }." }, { status: 400 });

  try {
    await connectDB();
    const drafts = await Payslip.find({ month: body.month, status: "draft" }).select("_id employeeId").lean();
    if (!drafts.length)
      return NextResponse.json({ error: "No draft payslips for this month." }, { status: 404 });

    await Payslip.updateMany(
      { _id: { $in: drafts.map((d) => d._id) } },
      {
        $set: {
          status: "published",
          publishedAt: new Date(),
          publishedBy: new mongoose.Types.ObjectId(guard.session.userId),
        },
      },
    );

    const label = formatMonth(body.month);
    await Promise.all(
      drafts.map((d) =>
        notifyEmployee(d.employeeId, {
          type: "payslip",
          title: "Payslip available",
          message: `Your payslip for ${label} is now available to view and download.`,
          link: "/my-payslips",
          email: true,
        }),
      ),
    );
    await logAudit({
      session: guard.session,
      req,
      action: "payroll.publish",
      entity: "Payslip",
      summary: `Published ${drafts.length} payslip(s) for ${body.month}`,
    });

    return NextResponse.json({ message: `Published ${drafts.length} payslip(s).`, published: drafts.length });
  } catch (err) {
    console.error("[payslips PATCH]", (err as Error).message);
    return NextResponse.json({ error: "Failed to publish payslips." }, { status: 500 });
  }
}
