/**
 * GET /api/attendance
 * Admin/HR can view all attendance records with filters
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAnyRole } from "@/lib/dal";
import Attendance from "@/lib/models/Attendance";
import Employee from "@/lib/models/Employee";
import Department from "@/lib/models/Department";
import { parseAttendanceDate } from "@/lib/utils/attendance";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  try {
    // Require Admin or HR role
    await requireAnyRole("admin", "hr");

    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const search = searchParams.get("search") || "";
    const month = searchParams.get("month"); // Format: YYYY-MM
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");
    const departmentId = searchParams.get("departmentId");
    const employeeId = searchParams.get("employeeId");
    const isLate = searchParams.get("isLate");
    const sortBy = searchParams.get("sortBy") || "attendanceDate";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    // Build query
    const query: any = {};

    // Employee filter
    if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
      query.employeeId = new mongoose.Types.ObjectId(employeeId);
    }

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

    // Status filter
    if (
      status &&
      ["present", "absent", "half-day", "on-leave"].includes(status)
    ) {
      query.status = status;
    }

    // Late filter
    if (isLate === "true") {
      query.isLate = true;
    }

    // Department filter - need to find employees first
    let employeeIds: mongoose.Types.ObjectId[] | undefined;
    if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
      const employees = await Employee.find({
        departmentId: new mongoose.Types.ObjectId(departmentId),
      })
        .select("_id")
        .lean();
      employeeIds = employees.map((e) => e._id);
      if (employeeIds.length > 0) {
        query.employeeId = { $in: employeeIds };
      } else {
        // No employees in department, return empty
        return NextResponse.json({
          attendance: [],
          pagination: { page, limit, total: 0, pages: 0 },
        });
      }
    }

    // Search by employee name or ID
    if (search) {
      const employees = await Employee.find({
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { employeeId: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      })
        .select("_id")
        .lean();

      const searchEmployeeIds = employees.map((e) => e._id);
      if (searchEmployeeIds.length > 0) {
        if (query.employeeId) {
          // Combine with existing employee filter
          query.employeeId = {
            $in: searchEmployeeIds,
            ...(query.employeeId.$in
              ? { $in: query.employeeId.$in }
              : { $eq: query.employeeId }),
          };
        } else {
          query.employeeId = { $in: searchEmployeeIds };
        }
      } else {
        // No matching employees, return empty
        return NextResponse.json({
          attendance: [],
          pagination: { page, limit, total: 0, pages: 0 },
        });
      }
    }

    // Get total count
    const total = await Attendance.countDocuments(query);

    // Build sort object
    const sort: any = {};
    if (sortBy === "attendanceDate") {
      sort.attendanceDate = sortOrder;
    } else if (sortBy === "status") {
      sort.status = sortOrder;
      sort.attendanceDate = -1;
    } else {
      sort.attendanceDate = sortOrder;
    }

    // Get paginated records with employee details
    const attendance = await Attendance.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "employeeId",
        select: "employeeId firstName lastName email departmentId",
        populate: {
          path: "departmentId",
          select: "name code",
        },
      })
      .lean();

    return NextResponse.json({
      attendance,
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
