/**
 * lib/leaveService.ts
 * Leave balance, application and review logic shared by the leave API
 * and the dashboard quick-approve endpoint.
 */

import "server-only";
import mongoose from "mongoose";
import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Leave, { LEAVE_TYPES, type LeaveType } from "@/lib/models/Leave";
import Attendance from "@/lib/models/Attendance";
import Employee from "@/lib/models/Employee";
import type { VerifiedSession } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { notifyEmployee, notifyPermissionHolders } from "@/lib/notify";
import { PERMISSIONS } from "@/lib/permissions";
import {
  LEAVE_ENTITLEMENTS,
  LEAVE_TYPE_LABELS,
  type LeaveBalanceRow,
} from "@/lib/leavePolicy";
import { parseAttendanceDate } from "@/lib/utils/attendance";
import { toDateString, workingDaysBetween } from "@/lib/utils/dates";

type Id = string | mongoose.Types.ObjectId;

/** Per-type balance for a calendar year. */
export async function getLeaveBalance(
  employeeId: Id,
  year: number,
): Promise<LeaveBalanceRow[]> {
  await connectDB();
  const yearStart = parseAttendanceDate(`${year}-01-01`);
  const yearEnd = parseAttendanceDate(`${year}-12-31`);

  const totals = await Leave.aggregate<{
    _id: { leaveType: LeaveType; status: string };
    days: number;
  }>([
    {
      $match: {
        employeeId: new mongoose.Types.ObjectId(employeeId.toString()),
        status: { $in: ["approved", "pending"] },
        startDate: { $gte: yearStart, $lte: yearEnd },
      },
    },
    {
      $group: {
        _id: { leaveType: "$leaveType", status: "$status" },
        days: { $sum: "$totalDays" },
      },
    },
  ]);

  return LEAVE_TYPES.map((leaveType) => {
    const used =
      totals.find(
        (t) => t._id.leaveType === leaveType && t._id.status === "approved",
      )?.days ?? 0;
    const pending =
      totals.find(
        (t) => t._id.leaveType === leaveType && t._id.status === "pending",
      )?.days ?? 0;
    const entitled = LEAVE_ENTITLEMENTS[leaveType];
    return {
      leaveType,
      entitled,
      used,
      pending,
      remaining: entitled === null ? null : Math.max(entitled - used, 0),
    };
  });
}

export interface ApplyLeaveInput {
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  isHalfDay: boolean;
  reason: string;
}

type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

export async function applyLeave(
  employeeId: Id,
  input: ApplyLeaveInput,
  session: VerifiedSession,
  req?: NextRequest,
): Promise<ServiceResult<{ id: string; totalDays: number }>> {
  await connectDB();

  if (input.endDate < input.startDate)
    return { ok: false, status: 400, error: "End date must be on or after start date." };
  if (input.isHalfDay && input.startDate !== input.endDate)
    return { ok: false, status: 400, error: "A half-day leave must start and end on the same date." };
  if (input.startDate.slice(0, 4) !== input.endDate.slice(0, 4))
    return { ok: false, status: 400, error: "A leave request cannot span two calendar years. Split it into two requests." };

  const days = workingDaysBetween(input.startDate, input.endDate).length;
  if (days === 0)
    return { ok: false, status: 400, error: "The selected dates fall on a weekend." };
  const totalDays = input.isHalfDay ? 0.5 : days;

  const start = parseAttendanceDate(input.startDate);
  const end = parseAttendanceDate(input.endDate);

  // Overlap with another pending/approved request?
  const overlap = await Leave.findOne({
    employeeId,
    status: { $in: ["pending", "approved"] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  }).lean();
  if (overlap)
    return { ok: false, status: 409, error: "You already have a leave request covering some of these dates." };

  // Balance check (pending requests count against the balance too)
  const entitled = LEAVE_ENTITLEMENTS[input.leaveType];
  if (entitled !== null) {
    const balance = await getLeaveBalance(employeeId, Number(input.startDate.slice(0, 4)));
    const row = balance.find((b) => b.leaveType === input.leaveType)!;
    const available = entitled - row.used - row.pending;
    if (totalDays > available)
      return {
        ok: false,
        status: 400,
        error: `Insufficient ${LEAVE_TYPE_LABELS[input.leaveType].toLowerCase()} leave balance. Available: ${Math.max(available, 0)} day(s).`,
      };
  }

  const leave = await Leave.create({
    employeeId,
    leaveType: input.leaveType,
    startDate: start,
    endDate: end,
    totalDays,
    isHalfDay: input.isHalfDay,
    reason: input.reason.trim(),
    status: "pending",
  });

  const emp = await Employee.findById(employeeId).select("firstName lastName").lean();
  const name = emp ? `${emp.firstName} ${emp.lastName}` : "An employee";

  await Promise.all([
    notifyPermissionHolders(
      PERMISSIONS.LEAVE_APPROVE,
      {
        type: "leave",
        title: "New leave request",
        message: `${name} applied for ${totalDays} day(s) of ${LEAVE_TYPE_LABELS[input.leaveType].toLowerCase()} leave (${input.startDate} to ${input.endDate}).`,
        link: "/leaves",
      },
      session.userId,
    ),
    logAudit({
      session,
      req,
      action: "leave.apply",
      entity: "Leave",
      entityId: leave._id.toString(),
      summary: `${name} applied for ${totalDays} day(s) of ${input.leaveType} leave`,
    }),
  ]);

  return { ok: true, data: { id: leave._id.toString(), totalDays } };
}

/** Approve or reject a pending request. */
export async function reviewLeave(
  leaveId: string,
  action: "approved" | "rejected",
  notes: string | undefined,
  session: VerifiedSession,
  req?: NextRequest,
): Promise<ServiceResult<{ status: string }>> {
  await connectDB();
  const leave = await Leave.findById(leaveId);
  if (!leave) return { ok: false, status: 404, error: "Leave request not found." };
  if (leave.status !== "pending")
    return { ok: false, status: 409, error: "Leave request is no longer pending." };

  // Reviewers may not approve their own leave
  const own = await Employee.findOne({ userId: session.userId }).select("_id").lean();
  if (own && own._id.equals(leave.employeeId))
    return { ok: false, status: 403, error: "You cannot review your own leave request." };

  leave.status = action;
  leave.reviewedBy = new mongoose.Types.ObjectId(session.userId);
  leave.reviewedAt = new Date();
  if (notes?.trim()) leave.reviewNotes = notes.trim().slice(0, 500);
  await leave.save();

  if (action === "approved") await markAttendanceOnLeave(leave.employeeId, leave.startDate, leave.endDate);

  const range = `${toDateString(leave.startDate)} to ${toDateString(leave.endDate)}`;
  await Promise.all([
    notifyEmployee(leave.employeeId, {
      type: "leave",
      title: `Leave ${action}`,
      message:
        `Your ${LEAVE_TYPE_LABELS[leave.leaveType].toLowerCase()} leave (${range}) was ${action} by ${session.user.name}.` +
        (leave.reviewNotes ? `\nNote: ${leave.reviewNotes}` : ""),
      link: "/leaves",
      email: true,
    }),
    logAudit({
      session,
      req,
      action: `leave.${action === "approved" ? "approve" : "reject"}`,
      entity: "Leave",
      entityId: leave._id.toString(),
      summary: `Leave ${range} ${action}`,
      details: { notes: leave.reviewNotes },
    }),
  ]);

  return { ok: true, data: { status: leave.status } };
}

/** Employee withdraws their own pending (or future approved) request. */
export async function cancelLeave(
  leaveId: string,
  employeeId: Id,
  session: VerifiedSession,
  req?: NextRequest,
): Promise<ServiceResult<{ status: string }>> {
  await connectDB();
  const leave = await Leave.findById(leaveId);
  if (!leave || !leave.employeeId.equals(employeeId.toString()))
    return { ok: false, status: 404, error: "Leave request not found." };

  const today = toDateString(new Date());
  const startsInFuture = toDateString(leave.startDate) > today;
  if (!(leave.status === "pending" || (leave.status === "approved" && startsInFuture)))
    return { ok: false, status: 409, error: "Only pending or upcoming approved leave can be cancelled." };

  const wasApproved = leave.status === "approved";
  leave.status = "cancelled";
  await leave.save();

  if (wasApproved) {
    // Remove the placeholder "on-leave" attendance rows created at approval
    await Attendance.deleteMany({
      employeeId: leave.employeeId,
      attendanceDate: { $gte: leave.startDate, $lte: leave.endDate },
      status: "on-leave",
      checkInAt: { $exists: false },
    });
  }

  await logAudit({
    session,
    req,
    action: "leave.cancel",
    entity: "Leave",
    entityId: leave._id.toString(),
    summary: `Leave ${toDateString(leave.startDate)} to ${toDateString(leave.endDate)} cancelled`,
  });

  return { ok: true, data: { status: leave.status } };
}

/** Create "on-leave" attendance rows for working days that have no record yet. */
async function markAttendanceOnLeave(employeeId: mongoose.Types.ObjectId, start: Date, end: Date) {
  const days = workingDaysBetween(toDateString(start), toDateString(end));
  if (!days.length) return;
  await Attendance.bulkWrite(
    days.map((d) => ({
      updateOne: {
        filter: { employeeId, attendanceDate: parseAttendanceDate(d) },
        update: {
          $setOnInsert: {
            employeeId,
            attendanceDate: parseAttendanceDate(d),
            status: "on-leave",
            notes: "Approved leave",
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  ).catch((err) => console.error("[leave] attendance sync:", (err as Error).message));
}

/** Resolve the employee record linked to the current user. */
export async function getOwnEmployee(session: VerifiedSession) {
  await connectDB();
  return Employee.findOne({ userId: session.userId }).lean();
}
