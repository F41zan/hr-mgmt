/**
 * GET /api/attendance/summary
 * Get attendance summary for dashboard (Admin/HR: all employees, Employee: own stats)
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/dal";
import Attendance from "@/lib/models/Attendance";
import Employee from "@/lib/models/Employee";
import {
  getCanonicalAttendanceDate,
  parseAttendanceDate,
  getMonthBoundaries,
} from "@/lib/utils/attendance";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    await connectDB();

    const today = getCanonicalAttendanceDate();
    const todayDate = parseAttendanceDate(today);

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const { start: monthStart, end: monthEnd } = getMonthBoundaries(
      currentYear,
      currentMonth,
    );

    if (session.role === "employee") {
      // Employee: return own statistics
      const employee = await Employee.findOne({
        userId: session.userId,
      }).lean();

      if (!employee) {
        return NextResponse.json(
          { error: "Employee record not found" },
          { status: 404 },
        );
      }

      // Today's attendance
      const todayAttendance = await Attendance.findOne({
        employeeId: employee._id,
        attendanceDate: todayDate,
      }).lean();

      // This month's statistics
      const monthlyStats = await Attendance.aggregate([
        {
          $match: {
            employeeId: employee._id,
            attendanceDate: { $gte: monthStart, $lte: monthEnd },
          },
        },
        {
          $group: {
            _id: null,
            present: {
              $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
            },
            absent: {
              $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
            },
            halfDay: {
              $sum: { $cond: [{ $eq: ["$status", "half-day"] }, 1, 0] },
            },
            onLeave: {
              $sum: { $cond: [{ $eq: ["$status", "on-leave"] }, 1, 0] },
            },
            lateArrivals: { $sum: { $cond: ["$isLate", 1, 0] } },
            earlyDepartures: { $sum: { $cond: ["$isEarlyDeparture", 1, 0] } },
            totalWorkingMinutes: { $sum: "$workingDurationMinutes" },
          },
        },
      ]);

      const stats = monthlyStats[0] || {
        present: 0,
        absent: 0,
        halfDay: 0,
        onLeave: 0,
        lateArrivals: 0,
        earlyDepartures: 0,
        totalWorkingMinutes: 0,
      };

      return NextResponse.json({
        role: "employee",
        employee: {
          id: employee._id,
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
        },
        today: {
          date: today,
          attendance: todayAttendance,
          hasCheckedIn: !!todayAttendance?.checkInAt,
          hasCheckedOut: !!todayAttendance?.checkOutAt,
        },
        thisMonth: {
          year: currentYear,
          month: currentMonth,
          ...stats,
          totalWorkingHours:
            Math.round((stats.totalWorkingMinutes / 60) * 10) / 10,
        },
      });
    } else {
      // Admin/HR: return organization-wide statistics

      // Today's statistics
      const todayStats = await Attendance.aggregate([
        {
          $match: {
            attendanceDate: todayDate,
          },
        },
        {
          $group: {
            _id: null,
            present: {
              $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
            },
            absent: {
              $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
            },
            halfDay: {
              $sum: { $cond: [{ $eq: ["$status", "half-day"] }, 1, 0] },
            },
            onLeave: {
              $sum: { $cond: [{ $eq: ["$status", "on-leave"] }, 1, 0] },
            },
            lateArrivals: { $sum: { $cond: ["$isLate", 1, 0] } },
            earlyDepartures: { $sum: { $cond: ["$isEarlyDeparture", 1, 0] } },
            missingCheckouts: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$checkInAt", null] },
                      { $eq: ["$checkOutAt", null] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

      const today_summary = todayStats[0] || {
        present: 0,
        absent: 0,
        halfDay: 0,
        onLeave: 0,
        lateArrivals: 0,
        earlyDepartures: 0,
        missingCheckouts: 0,
      };

      // This month's statistics
      const monthlyStats = await Attendance.aggregate([
        {
          $match: {
            attendanceDate: { $gte: monthStart, $lte: monthEnd },
          },
        },
        {
          $group: {
            _id: null,
            present: {
              $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
            },
            absent: {
              $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
            },
            halfDay: {
              $sum: { $cond: [{ $eq: ["$status", "half-day"] }, 1, 0] },
            },
            onLeave: {
              $sum: { $cond: [{ $eq: ["$status", "on-leave"] }, 1, 0] },
            },
            lateArrivals: { $sum: { $cond: ["$isLate", 1, 0] } },
            totalWorkingMinutes: { $sum: "$workingDurationMinutes" },
          },
        },
      ]);

      const month_summary = monthlyStats[0] || {
        present: 0,
        absent: 0,
        halfDay: 0,
        onLeave: 0,
        lateArrivals: 0,
        totalWorkingMinutes: 0,
      };

      // Count total active employees
      const totalActiveEmployees = await Employee.countDocuments({
        status: "active",
      });

      return NextResponse.json({
        role: session.role,
        today: {
          date: today,
          totalEmployees: totalActiveEmployees,
          ...today_summary,
          attendanceRate:
            totalActiveEmployees > 0
              ? Math.round((today_summary.present / totalActiveEmployees) * 100)
              : 0,
        },
        thisMonth: {
          year: currentYear,
          month: currentMonth,
          ...month_summary,
          totalWorkingHours:
            Math.round((month_summary.totalWorkingMinutes / 60) * 10) / 10,
        },
      });
    }
  } catch (error: any) {
    console.error("Get summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance summary" },
      { status: 500 },
    );
  }
}
