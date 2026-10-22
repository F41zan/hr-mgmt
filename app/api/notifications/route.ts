/**
 * GET   /api/notifications — Own notifications (?unread=true, ?type=, page, limit) + unreadCount
 * PATCH /api/notifications — Mark all own notifications as read
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getVerifiedSession } from "@/lib/dal";
import Notification, { NOTIFICATION_TYPES } from "@/lib/models/Notification";
import { sendDueInterviewReminders } from "@/lib/recruitmentService";

export async function GET(req: NextRequest) {
  const session = await getVerifiedSession();
  if (!session)
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });

  try {
    await connectDB();
    // Opportunistically deliver any due interview reminders (idempotent)
    await sendDueInterviewReminders();

    const sp = req.nextUrl.searchParams;
    const page = Math.max(parseInt(sp.get("page") || "1"), 1);
    const limit = Math.min(Math.max(parseInt(sp.get("limit") || "20"), 1), 100);
    const type = sp.get("type");

    const query: Record<string, unknown> = { userId: session.userId };
    if (sp.get("unread") === "true") query.isRead = false;
    if (type && (NOTIFICATION_TYPES as readonly string[]).includes(type)) query.type = type;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-dedupeKey")
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId: session.userId, isRead: false }),
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[notifications GET]", (err as Error).message);
    return NextResponse.json({ error: "Failed to load notifications." }, { status: 500 });
  }
}

export async function PATCH() {
  const session = await getVerifiedSession();
  if (!session)
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });

  await connectDB();
  const result = await Notification.updateMany(
    { userId: session.userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
  );
  return NextResponse.json({ success: true, updated: result.modifiedCount });
}
