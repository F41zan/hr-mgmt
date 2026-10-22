/**
 * PATCH /api/dashboard/leave/[id]
 * Approve or reject a pending leave request (dashboard quick action).
 * Requires the leave.approve permission. Shares logic with /api/leaves/[id].
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { apiGuard } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import { reviewLeave } from "@/lib/leaveService";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await apiGuard(PERMISSIONS.LEAVE_APPROVE);
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Invalid ID." }, { status: 400 });

  let body: { action?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  if (body.action !== "approved" && body.action !== "rejected")
    return NextResponse.json(
      { error: "Action must be 'approved' or 'rejected'." },
      { status: 400 },
    );

  const result = await reviewLeave(id, body.action, body.notes, guard.session, req);
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ success: true, status: result.data.status });
}
