/**
 * GET /api/attendance/[id] - Get single attendance record
 * PATCH /api/attendance/[id] - Correct attendance (Admin/HR only)
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAnyRole, requireAuth } from "@/lib/dal";
import Attendance from "@/lib/models/Attendance";
import Employee from "@/lib/models/Employee";
import {
  calculateWorkingDuration,
  calculateLateArrival,
  calculateEarlyDeparture,
  determineAttendanceStatus,
} from "@/lib/utils/attendance";
import mongoose from "mongoose";
import { z } from "zod";

const correctionSchema = z.object({
  checkInAt: z.string().optional(),
  checkOutAt: z.string().optional(),
  status: z.enum(["present", "absent", "half-day", "on-leave"]).optional(),
  reason: z.string().min(5, "Reason must be at least 5 characters").max(500),
});

// GET single attendance record
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid attendance ID" },
        { status: 400 },
      );
    }

    const attendance = await Attendance.findById(id)
      .populate({
        path: "employeeId",
        select: "employeeId firstName lastName email departmentId",
        populate: {
          path: "departmentId",
          select: "name code",
        },
      })
      .lean();

    if (!attendance) {
      return NextResponse.json(
        { error: "Attendance record not found" },
        { status: 404 },
      );
    }

    // Check authorization
    if (session.role === "employee") {
      // Employee can only view their own records
      const employee = await Employee.findOne({
        userId: session.userId,
      }).lean();
      if (!employee || !attendance.employeeId._id.equals(employee._id)) {
        return NextResponse.json(
          { error: "You can only view your own attendance records" },
          { status: 403 },
        );
      }
    }

    return NextResponse.json({ attendance });
  } catch (error: any) {
    console.error("Get attendance error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance record" },
      { status: 500 },
    );
  }
}

// PATCH - Correct attendance
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Only Admin/HR can correct attendance
    const session = await requireAnyRole("admin", "hr");
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid attendance ID" },
        { status: 400 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = correctionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { checkInAt, checkOutAt, status, reason } = validation.data;

    // Find attendance record
    const attendance = await Attendance.findById(id);

    if (!attendance) {
      return NextResponse.json(
        { error: "Attendance record not found" },
        { status: 404 },
      );
    }

    // Store previous values for audit
    const previousValues: any = {
      checkInAt: attendance.checkInAt,
      checkOutAt: attendance.checkOutAt,
      status: attendance.status,
      workingDurationMinutes: attendance.workingDurationMinutes,
    };

    // Prepare new values
    const newValues: any = {};
    let recalculate = false;

    // Update check-in time
    if (checkInAt !== undefined) {
      const newCheckIn = checkInAt ? new Date(checkInAt) : undefined;
      if (newCheckIn) {
        // Validate date
        if (isNaN(newCheckIn.getTime())) {
          return NextResponse.json(
            { error: "Invalid check-in time" },
            { status: 400 },
          );
        }
        attendance.checkInAt = newCheckIn;
        newValues.checkInAt = newCheckIn;
        recalculate = true;

        // Recalculate late arrival
        const { isLate, lateMinutes } = calculateLateArrival(newCheckIn);
        attendance.isLate = isLate;
        attendance.lateMinutes = lateMinutes;
      }
    }

    // Update check-out time
    if (checkOutAt !== undefined) {
      const newCheckOut = checkOutAt ? new Date(checkOutAt) : undefined;
      if (newCheckOut) {
        // Validate date
        if (isNaN(newCheckOut.getTime())) {
          return NextResponse.json(
            { error: "Invalid check-out time" },
            { status: 400 },
          );
        }

        // Validate check-out is after check-in
        if (attendance.checkInAt && newCheckOut <= attendance.checkInAt) {
          return NextResponse.json(
            { error: "Check-out time must be after check-in time" },
            { status: 400 },
          );
        }

        attendance.checkOutAt = newCheckOut;
        newValues.checkOutAt = newCheckOut;
        recalculate = true;

        // Recalculate early departure
        const { isEarlyDeparture, earlyDepartureMinutes } =
          calculateEarlyDeparture(newCheckOut);
        attendance.isEarlyDeparture = isEarlyDeparture;
        attendance.earlyDepartureMinutes = earlyDepartureMinutes;
      }
    }

    // Recalculate working duration if times changed
    if (recalculate && attendance.checkInAt && attendance.checkOutAt) {
      const duration = calculateWorkingDuration(
        attendance.checkInAt,
        attendance.checkOutAt,
      );
      attendance.workingDurationMinutes = duration;
      newValues.workingDurationMinutes = duration;

      // Auto-determine status based on working duration if not manually set
      if (!status) {
        const autoStatus = determineAttendanceStatus(duration, true);
        attendance.status = autoStatus;
        newValues.status = autoStatus;
      }
    }

    // Update status if provided
    if (status) {
      attendance.status = status;
      newValues.status = status;
    }

    // Mark as manually corrected
    attendance.isManuallyCorrected = true;

    // Add correction to history
    attendance.correctionHistory.push({
      correctedBy: new mongoose.Types.ObjectId(session.userId),
      correctedAt: new Date(),
      reason: reason.trim(),
      previousValues,
      newValues,
    });

    // Save attendance record
    await attendance.save();

    // Populate employee details for response
    await attendance.populate({
      path: "employeeId",
      select: "employeeId firstName lastName email departmentId",
    });

    return NextResponse.json({
      message: "Attendance corrected successfully",
      attendance,
    });
  } catch (error: any) {
    console.error("Correct attendance error:", error);
    return NextResponse.json(
      { error: "Failed to correct attendance record" },
      { status: 500 },
    );
  }
}
