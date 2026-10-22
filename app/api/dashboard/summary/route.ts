/**
 * GET /api/dashboard/summary
 * Returns dashboard data based on the caller's role.
 * Admin/HR → org-level stats. Employee → their own stats.
 */

import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/lib/dal";
import {
  getEmployeeSummary,
  getTodayAttendance,
  getAttendanceTrend,
  getLeaveSummary,
  getPendingLeaves,
  getDepartmentDistribution,
  getRecentActivity,
  getUpcomingEvents,
  getMyAttendance,
  getMyLeaves,
} from "@/lib/dashboardService";

export async function GET(req: NextRequest) {
  const session = await getVerifiedSession();
  if (!session)
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const days = Math.min(
    Math.max(parseInt(searchParams.get("days") ?? "7"), 7),
    90,
  );

  try {
    if (session.role === "admin" || session.role === "hr") {
      const [
        employees,
        todayAttendance,
        trend,
        leaveSummary,
        pendingLeaves,
        departments,
        activity,
        events,
      ] = await Promise.all([
        getEmployeeSummary(),
        getTodayAttendance(),
        getAttendanceTrend(days),
        getLeaveSummary(),
        getPendingLeaves(10),
        getDepartmentDistribution(),
        getRecentActivity(10),
        getUpcomingEvents(30),
      ]);

      return NextResponse.json({
        role: session.role,
        employees,
        todayAttendance,
        trend,
        leaveSummary,
        pendingLeaves,
        departments,
        activity,
        events,
      });
    }

    // Employee — own data only
    const [myAttendance, myLeaves] = await Promise.all([
      getMyAttendance(session.userId, 30),
      getMyLeaves(session.userId),
    ]);

    return NextResponse.json({ role: session.role, myAttendance, myLeaves });
  } catch (err) {
    console.error("[dashboard/summary]", (err as Error).message);
    return NextResponse.json(
      { error: "Failed to load dashboard data." },
      { status: 500 },
    );
  }
}
