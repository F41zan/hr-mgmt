/**
 * PATCH /api/leaves/[id]
 *   { action: "approved" | "rejected", notes? }  — leave.approve holders
 *   { action: "cancelled" }                      — the employee who applied
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { apiGuard } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import { cancelLeave, getOwnEmployee, reviewLeave } from "@/lib/leaveService";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await apiGuard();
  if (guard instanceof NextResponse) return guard;
  const { session, can } = guard;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Invalid ID." }, { status: 400 });

  let body: { action?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  try {
    if (body.action === "cancelled") {
      const own = await getOwnEmployee(session);
      if (!own) return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
      const result = await cancelLeave(id, own._id, session, req);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json({ success: true, status: result.data.status });
    }

    if (body.action !== "approved" && body.action !== "rejected")
      return NextResponse.json(
        { error: "Action must be 'approved', 'rejected' or 'cancelled'." },
        { status: 400 },
      );

    if (!can(PERMISSIONS.LEAVE_APPROVE))
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const result = await reviewLeave(id, body.action, body.notes, session, req);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, status: result.data.status });
  } catch (err) {
    console.error("[leaves PATCH]", (err as Error).message);
    return NextResponse.json({ error: "Failed to update leave request." }, { status: 500 });
  }
}
