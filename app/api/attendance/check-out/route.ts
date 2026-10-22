/**
 * POST /api/attendance/check-out
 * Employee checks out for the current working day
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/dal";
import Attendance from "@/lib/models/Attendance";
import Employee from "@/lib/models/Employee";
import {
  getCanonicalAttendanceDate,
  calculateWorkingDuration,
  calculateEarlyDeparture,
  determineAttendanceStatus,
  parseAttendanceDate,
} from "@/lib/utils/attendance";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await requireAuth();

    await connectDB();

    // Find employee record from authenticated user
    const employee = await Employee.findOne({ userId: session.userId }).lean();

    if (!employee) {
      return NextResponse.json(
        { error: "Employee record not found" },
        { status: 404 },
      );
    }

    // Get current date in business timezone
    const today = getCanonicalAttendanceDate();
    const todayDate = parseAttendanceDate(today);
    const checkOutTime = new Date();

    // Find today's attendance record
    const attendance = await Attendance.findOne({
      employeeId: employee._id,
      attendanceDate: todayDate,
    });

    if (!attendance) {
      return NextResponse.json(
        { error: "No check-in record found. Please check in first." },
        { status: 400 },
      );
    }

    if (!attendance.checkInAt) {
      return NextResponse.json(
        { error: "No check-in time recorded. Please check in first." },
        { status: 400 },
      );
    }

    if (attendance.checkOutAt) {
      return NextResponse.json(
        {
          error: "You have already checked out today",
          attendance,
        },
        { status: 400 },
      );
    }

    // Validate check-out is after check-in
    if (checkOutTime <= attendance.checkInAt) {
      return NextResponse.json(
        { error: "Check-out time must be after check-in time" },
        { status: 400 },
      );
    }

    // Calculate working duration
    const workingDurationMinutes = calculateWorkingDuration(
      attendance.checkInAt,
      checkOutTime,
    );

    // Calculate early departure
    const { isEarlyDeparture, earlyDepartureMinutes } =
      calculateEarlyDeparture(checkOutTime);

    // Determine attendance status
    const status = determineAttendanceStatus(workingDurationMinutes, true);

    // Update attendance record
    attendance.checkOutAt = checkOutTime;
    attendance.workingDurationMinutes = workingDurationMinutes;
    attendance.isEarlyDeparture = isEarlyDeparture;
    attendance.earlyDepartureMinutes = earlyDepartureMinutes;
    attendance.status = status;

    await attendance.save();

    return NextResponse.json(
      {
        message: "Checked out successfully",
        attendance: {
          _id: attendance._id,
          checkInAt: attendance.checkInAt,
          checkOutAt: attendance.checkOutAt,
          workingDurationMinutes: attendance.workingDurationMinutes,
          status: attendance.status,
          isLate: attendance.isLate,
          lateMinutes: attendance.lateMinutes,
          isEarlyDeparture: attendance.isEarlyDeparture,
          earlyDepartureMinutes: attendance.earlyDepartureMinutes,
          attendanceDate: attendance.attendanceDate,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Check-out error:", error);

    return NextResponse.json(
      { error: "Failed to check out. Please try again." },
      { status: 500 },
    );
  }
}
