/**
 * GET /api/leaves/balance?year=2026[&employeeId=...]
 * Own balance for everyone; any employee's balance for leave.approve holders.
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { apiGuard } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import { getLeaveBalance, getOwnEmployee } from "@/lib/leaveService";

export async function GET(req: NextRequest) {
  const guard = await apiGuard();
  if (guard instanceof NextResponse) return guard;
  const { session, can } = guard;

  const sp = req.nextUrl.searchParams;
  const year = parseInt(sp.get("year") || String(new Date().getFullYear()));
  if (!Number.isInteger(year) || year < 2000 || year > 2100)
    return NextResponse.json({ error: "Invalid year." }, { status: 400 });

  try {
    let employeeId = sp.get("employeeId");
    if (employeeId) {
      if (!can(PERMISSIONS.LEAVE_APPROVE))
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      if (!mongoose.Types.ObjectId.isValid(employeeId))
        return NextResponse.json({ error: "Invalid employee ID." }, { status: 400 });
    } else {
      const own = await getOwnEmployee(session);
      if (!own) return NextResponse.json({ balance: [], year, noEmployeeRecord: true });
      employeeId = own._id.toString();
    }

    const balance = await getLeaveBalance(employeeId, year);
    return NextResponse.json({ balance, year });
  } catch (err) {
    console.error("[leaves/balance]", (err as Error).message);
    return NextResponse.json({ error: "Failed to load leave balance." }, { status: 500 });
  }
}
