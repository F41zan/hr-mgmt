/**
 * GET /api/attendance/calendar
 * Get monthly attendance calendar
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/dal";
import Attendance from "@/lib/models/Attendance";
import Employee from "@/lib/models/Employee";
import { getMonthBoundaries, getDaysInMonth } from "@/lib/utils/attendance";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const year = parseInt(
      searchParams.get("year") || new Date().getFullYear().toString(),
    );
    const month = parseInt(
      searchParams.get("month") || (new Date().getMonth() + 1).toString(),
    );
    const employeeIdParam = searchParams.get("employeeId");

    // Validate month and year
    if (month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Invalid month. Must be between 1 and 12" },
        { status: 400 },
      );
    }

    if (year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    let employeeId: mongoose.Types.ObjectId;

    // Determine which employee's calendar to fetch
    if (session.role === "employee") {
      // Employees can only view their own calendar
      const employee = await Employee.findOne({
        userId: session.userId,
      }).lean();
      if (!employee) {
        return NextResponse.json(
          { error: "Employee record not found" },
          { status: 404 },
        );
      }
      employeeId = employee._id;
    } else {
      // Admin/HR can view any employee's calendar
      if (!employeeIdParam) {
        return NextResponse.json(
          { error: "Employee ID is required for Admin/HR" },
          { status: 400 },
        );
      }

      if (!mongoose.Types.ObjectId.isValid(employeeIdParam)) {
        return NextResponse.json(
          { error: "Invalid employee ID" },
          { status: 400 },
        );
      }

      employeeId = new mongoose.Types.ObjectId(employeeIdParam);
    }

    // Get month boundaries
    const { start, end } = getMonthBoundaries(year, month);

    // Fetch all attendance records for the month
    const attendanceRecords = await Attendance.find({
      employeeId,
      attendanceDate: { $gte: start, $lte: end },
    })
      .sort({ attendanceDate: 1 })
      .lean();

    // Calculate summary statistics
    const summary = {
      present: 0,
      absent: 0,
      halfDay: 0,
      onLeave: 0,
      lateArrivals: 0,
      earlyDepartures: 0,
      totalWorkingHours: 0,
    };

    attendanceRecords.forEach((record) => {
      if (record.status === "present") summary.present++;
      else if (record.status === "absent") summary.absent++;
      else if (record.status === "half-day") summary.halfDay++;
      else if (record.status === "on-leave") summary.onLeave++;

      if (record.isLate) summary.lateArrivals++;
      if (record.isEarlyDeparture) summary.earlyDepartures++;
      if (record.workingDurationMinutes) {
        summary.totalWorkingHours += record.workingDurationMinutes / 60;
      }
    });

    // Get employee details
    const employee = await Employee.findById(employeeId)
      .select("employeeId firstName lastName email departmentId")
      .populate("departmentId", "name code")
      .lean();

    return NextResponse.json({
      year,
      month,
      daysInMonth: getDaysInMonth(year, month),
      employee,
      attendance: attendanceRecords,
      summary: {
        ...summary,
        totalWorkingHours: Math.round(summary.totalWorkingHours * 10) / 10, // Round to 1 decimal
      },
    });
  } catch (error: any) {
    console.error("Get calendar error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance calendar" },
      { status: 500 },
    );
  }
}
