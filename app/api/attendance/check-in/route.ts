/**
 * POST /api/attendance/check-in
 * Employee checks in for the current working day
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/dal";
import Attendance from "@/lib/models/Attendance";
import Employee from "@/lib/models/Employee";
import {
  getCanonicalAttendanceDate,
  calculateLateArrival,
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

    // Check if employee is active
    if (employee.status !== "active") {
      return NextResponse.json(
        { error: "Only active employees can check in" },
        { status: 403 },
      );
    }

    // Get current date in business timezone
    const today = getCanonicalAttendanceDate();
    const todayDate = parseAttendanceDate(today);
    const checkInTime = new Date();

    // Check if attendance already exists for today
    const existingAttendance = await Attendance.findOne({
      employeeId: employee._id,
      attendanceDate: todayDate,
    });

    if (existingAttendance) {
      if (existingAttendance.checkInAt) {
        return NextResponse.json(
          {
            error: "You have already checked in today",
            attendance: existingAttendance,
          },
          { status: 400 },
        );
      }
    }

    // Calculate late arrival
    const { isLate, lateMinutes } = calculateLateArrival(checkInTime);

    // Create or update attendance record
    const attendance = await Attendance.findOneAndUpdate(
      {
        employeeId: employee._id,
        attendanceDate: todayDate,
      },
      {
        $setOnInsert: {
          employeeId: employee._id,
          attendanceDate: todayDate,
        },
        $set: {
          checkInAt: checkInTime,
          status: "present",
          isLate,
          lateMinutes,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    );

    return NextResponse.json(
      {
        message: "Checked in successfully",
        attendance: {
          _id: attendance._id,
          checkInAt: attendance.checkInAt,
          status: attendance.status,
          isLate: attendance.isLate,
          lateMinutes: attendance.lateMinutes,
          attendanceDate: attendance.attendanceDate,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Check-in error:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Attendance already recorded for today" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to check in. Please try again." },
      { status: 500 },
    );
  }
}
