/**
 * PATCH /api/dashboard/leave/[id]
 * Approve or reject a pending leave request. Admin/HR only.
 */

import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/lib/dal";
import { connectDB } from "@/lib/db";
import Leave from "@/lib/models/Leave";
import mongoose from "mongoose";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getVerifiedSession();
  if (!session)
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  if (!["admin", "hr"].includes(session.role))
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Invalid ID." }, { status: 400 });

  let body: { action?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  if (!["approved", "rejected"].includes(body.action ?? ""))
    return NextResponse.json(
      { error: "Action must be 'approved' or 'rejected'." },
      { status: 400 },
    );

  await connectDB();
  const leave = await Leave.findById(id);
  if (!leave)
    return NextResponse.json(
      { error: "Leave request not found." },
      { status: 404 },
    );
  if (leave.status !== "pending")
    return NextResponse.json(
      { error: "Leave request is no longer pending." },
      { status: 409 },
    );

  leave.status = body.action as "approved" | "rejected";
  leave.reviewedBy = new mongoose.Types.ObjectId(session.userId);
  leave.reviewedAt = new Date();
  if (body.notes) leave.reviewNotes = body.notes;
  await leave.save();

  return NextResponse.json({ success: true, status: leave.status });
}
