/**
 * GET /api/reports/payroll?year=YYYY[&month=YYYY-MM][&format=csv]
 * Monthly payroll totals for the year, department breakdown for `month`
 * (default: latest month with payslips). CSV = payslip register for `month`.
 * Requires reports.view.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { apiGuard } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import Payslip from "@/lib/models/Payslip";
import { MONTH_RE } from "@/lib/utils/dates";
import { toCsv } from "@/lib/utils/csv";

export async function GET(req: NextRequest) {
  const guard = await apiGuard(PERMISSIONS.REPORTS_VIEW);
  if (guard instanceof NextResponse) return guard;

  const sp = req.nextUrl.searchParams;
  const year = parseInt(sp.get("year") || String(new Date().getFullYear()));
  if (!Number.isInteger(year) || year < 2000 || year > 2100)
    return NextResponse.json({ error: "Invalid year." }, { status: 400 });

  try {
    await connectDB();
    const monthly = await Payslip.aggregate<{
      _id: string;
      headcount: number;
      gross: number;
      deductions: number;
      net: number;
      lopDays: number;
      published: number;
    }>([
      { $match: { month: { $regex: `^${year}-` } } },
      {
        $group: {
          _id: "$month",
          headcount: { $sum: 1 },
          gross: { $sum: "$grossEarnings" },
          deductions: { $sum: "$totalDeductions" },
          net: { $sum: "$netPay" },
          lopDays: { $sum: "$lopDays" },
          published: { $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const requested = sp.get("month");
    const month =
      requested && MONTH_RE.test(requested) ? requested : monthly[monthly.length - 1]?._id;

    if (sp.get("format") === "csv") {
      if (!month) return NextResponse.json({ error: "No payroll data." }, { status: 404 });
      const slips = await Payslip.find({ month }).sort({ "employee.code": 1 }).lean();
      const amount = (lines: { label: string; amount: number }[], label: string) =>
        lines.find((l) => l.label === label)?.amount ?? 0;
      const csv = toCsv(
        ["Month", "Employee ID", "Name", "Department", "Designation", "Working Days", "Paid Days", "LOP Days",
          "Basic", "HRA", "Special Allowance", "Other Allowances", "Gross",
          "PF", "Professional Tax", "TDS", "Other Deductions", "Total Deductions", "Net Pay", "Status"],
        slips.map((p) => [
          p.month, p.employee.code, p.employee.name, p.employee.department, p.employee.designation,
          p.workingDays, p.paidDays, p.lopDays,
          amount(p.earnings, "Basic Salary"), amount(p.earnings, "House Rent Allowance"),
          amount(p.earnings, "Special Allowance"), amount(p.earnings, "Other Allowances"), p.grossEarnings,
          amount(p.deductions, "Provident Fund"), amount(p.deductions, "Professional Tax"),
          amount(p.deductions, "Income Tax (TDS)"), amount(p.deductions, "Other Deductions"),
          p.totalDeductions, p.netPay, p.status,
        ]),
      );
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="payroll-register-${month}.csv"`,
        },
      });
    }

    const byDepartment = month
      ? await Payslip.aggregate<{ _id: string | null; headcount: number; gross: number; net: number }>([
          { $match: { month } },
          {
            $group: {
              _id: "$employee.department",
              headcount: { $sum: 1 },
              gross: { $sum: "$grossEarnings" },
              net: { $sum: "$netPay" },
            },
          },
          { $sort: { gross: -1 } },
        ])
      : [];

    const ytd = monthly.reduce(
      (t, m) => ({ gross: t.gross + m.gross, deductions: t.deductions + m.deductions, net: t.net + m.net }),
      { gross: 0, deductions: 0, net: 0 },
    );

    return NextResponse.json({
      year,
      month: month ?? null,
      ytd,
      monthly: monthly.map((m) => ({ month: m._id, ...m, _id: undefined })),
      byDepartment: byDepartment.map((d) => ({
        department: d._id ?? "Unassigned",
        headcount: d.headcount,
        gross: d.gross,
        net: d.net,
        average: d.headcount ? Math.round(d.gross / d.headcount) : 0,
      })),
    });
  } catch (err) {
    console.error("[reports/payroll]", (err as Error).message);
    return NextResponse.json({ error: "Failed to build payroll report." }, { status: 500 });
  }
}
