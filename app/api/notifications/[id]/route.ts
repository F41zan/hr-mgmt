/**
 * PATCH  /api/notifications/[id] — Mark one own notification read/unread { isRead?: boolean }
 * DELETE /api/notifications/[id] — Dismiss one own notification
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getVerifiedSession } from "@/lib/dal";
import Notification from "@/lib/models/Notification";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getVerifiedSession();
  if (!session)
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Invalid ID." }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { isRead?: unknown };
  const isRead = body.isRead === undefined ? true : body.isRead === true;

  await connectDB();
  const updated = await Notification.findOneAndUpdate(
    { _id: id, userId: session.userId },
    { $set: { isRead, readAt: isRead ? new Date() : undefined } },
    { new: true },
  ).lean();
  if (!updated) return NextResponse.json({ error: "Notification not found." }, { status: 404 });

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getVerifiedSession();
  if (!session)
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Invalid ID." }, { status: 400 });

  await connectDB();
  const result = await Notification.deleteOne({ _id: id, userId: session.userId });
  if (!result.deletedCount)
    return NextResponse.json({ error: "Notification not found." }, { status: 404 });

  return NextResponse.json({ success: true });
}
