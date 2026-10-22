/**
 * GET /api/attendance/me
 * Get current employee's attendance history
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/dal";
import Attendance from "@/lib/models/Attendance";
import Employee from "@/lib/models/Employee";
import {
  getCanonicalAttendanceDate,
  parseAttendanceDate,
} from "@/lib/utils/attendance";

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const month = searchParams.get("month"); // Format: YYYY-MM
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build query
    const query: any = {
      employeeId: employee._id,
    };

    // Date filtering
    if (month) {
      const [year, monthNum] = month.split("-").map(Number);
      const start = new Date(year, monthNum - 1, 1);
      const end = new Date(year, monthNum, 0, 23, 59, 59, 999);
      query.attendanceDate = { $gte: start, $lte: end };
    } else if (startDate && endDate) {
      query.attendanceDate = {
        $gte: parseAttendanceDate(startDate),
        $lte: parseAttendanceDate(endDate),
      };
    }

    // Get total count
    const total = await Attendance.countDocuments(query);

    // Get paginated records
    const attendance = await Attendance.find(query)
      .sort({ attendanceDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get today's attendance
    const today = getCanonicalAttendanceDate();
    const todayDate = parseAttendanceDate(today);
    const todayAttendance = await Attendance.findOne({
      employeeId: employee._id,
      attendanceDate: todayDate,
    }).lean();

    return NextResponse.json({
      attendance,
      todayAttendance,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Get attendance error:", error);

    return NextResponse.json(
      { error: "Failed to fetch attendance records" },
      { status: 500 },
    );
  }
}
