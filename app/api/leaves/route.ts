/**
 * GET  /api/leaves  — List leave requests
 *        leave.approve holders: all requests (filters: status, leaveType, search, month, employeeId)
 *        everyone else: own requests only (?scope=mine forces own for approvers too)
 * POST /api/leaves  — Apply for leave (for the caller's own employee record)
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { apiGuard } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import Leave, { LEAVE_STATUS, LEAVE_TYPES } from "@/lib/models/Leave";
import Employee from "@/lib/models/Employee";
import "@/lib/models/Department";
import { applyLeave, getOwnEmployee } from "@/lib/leaveService";
import { parseAttendanceDate } from "@/lib/utils/attendance";
import { MONTH_RE, isValidDateString, monthRange } from "@/lib/utils/dates";

const applySchema = z.object({
  leaveType: z.enum(LEAVE_TYPES),
  startDate: z.string().refine(isValidDateString, "Invalid start date"),
  endDate: z.string().refine(isValidDateString, "Invalid end date"),
  isHalfDay: z.boolean().optional().default(false),
  reason: z.string().trim().min(3, "Reason must be at least 3 characters").max(500),
});

export async function GET(req: NextRequest) {
  const guard = await apiGuard();
  if (guard instanceof NextResponse) return guard;
  const { session, can } = guard;

  try {
    await connectDB();
    const sp = req.nextUrl.searchParams;
    const page = Math.max(parseInt(sp.get("page") || "1"), 1);
    const limit = Math.min(Math.max(parseInt(sp.get("limit") || "20"), 1), 100);
    const status = sp.get("status");
    const leaveType = sp.get("leaveType");
    const month = sp.get("month");
    const search = sp.get("search")?.trim();
    const employeeId = sp.get("employeeId");
    const mine = sp.get("scope") === "mine" || !can(PERMISSIONS.LEAVE_APPROVE);

    const query: Record<string, unknown> = {};

    if (mine) {
      const own = await getOwnEmployee(session);
      if (!own)
        return NextResponse.json({
          leaves: [],
          pagination: { page, limit, total: 0, pages: 0 },
          noEmployeeRecord: true,
        });
      query.employeeId = own._id;
    } else if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
      query.employeeId = new mongoose.Types.ObjectId(employeeId);
    } else if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matches = await Employee.find({
        $or: [
          { firstName: { $regex: escaped, $options: "i" } },
          { lastName: { $regex: escaped, $options: "i" } },
          { employeeId: { $regex: escaped, $options: "i" } },
        ],
      })
        .select("_id")
        .lean();
      query.employeeId = { $in: matches.map((m) => m._id) };
    }

    if (status && (LEAVE_STATUS as readonly string[]).includes(status)) query.status = status;
    if (leaveType && (LEAVE_TYPES as readonly string[]).includes(leaveType)) query.leaveType = leaveType;
    if (month && MONTH_RE.test(month)) {
      const { start, end } = monthRange(month);
      query.startDate = { $lte: parseAttendanceDate(end) };
      query.endDate = { $gte: parseAttendanceDate(start) };
    }

    const [total, leaves] = await Promise.all([
      Leave.countDocuments(query),
      Leave.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({
          path: "employeeId",
          select: "employeeId firstName lastName departmentId",
          populate: { path: "departmentId", select: "name" },
        })
        .populate("reviewedBy", "name")
        .lean(),
    ]);

    return NextResponse.json({
      leaves,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[leaves GET]", (err as Error).message);
    return NextResponse.json({ error: "Failed to load leave requests." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await apiGuard();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = applySchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );

  try {
    const own = await getOwnEmployee(session);
    if (!own)
      return NextResponse.json(
        { error: "Your account is not linked to an employee record." },
        { status: 404 },
      );
    if (own.status !== "active" && own.status !== "on_leave")
      return NextResponse.json({ error: "Only active employees can apply for leave." }, { status: 403 });

    const result = await applyLeave(own._id, parsed.data, session, req);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

    return NextResponse.json(
      { message: "Leave request submitted.", leave: result.data },
      { status: 201 },
    );
  } catch (err) {
    console.error("[leaves POST]", (err as Error).message);
    return NextResponse.json({ error: "Failed to submit leave request." }, { status: 500 });
  }
}
