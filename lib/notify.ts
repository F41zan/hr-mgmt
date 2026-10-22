/**
 * lib/notify.ts
 * Create in-app notifications (and best-effort emails). Never throws.
 */

import "server-only";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Notification, { type NotificationType } from "@/lib/models/Notification";
import Employee from "@/lib/models/Employee";
import User from "@/lib/models/User";
import { sendNotificationEmail } from "@/lib/email";
import { getPermissionsForRole } from "@/lib/access";
import type { Permission } from "@/lib/permissions";
import type { Role } from "@/lib/roles";

export interface NotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  dedupeKey?: string;
  email?: boolean; // also send an email when SMTP is configured
}

type Id = string | mongoose.Types.ObjectId;

/** Notify specific user accounts. */
export async function notifyUsers(
  userIds: Id[],
  input: NotificationInput,
): Promise<void> {
  const unique = [...new Set(userIds.map((id) => id.toString()))];
  if (!unique.length) return;

  try {
    await connectDB();
    const docs = unique.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      dedupeKey: input.dedupeKey,
    }));
    // ordered:false so one duplicate dedupeKey does not block the others
    await Notification.insertMany(docs, { ordered: false }).catch(
      (err: { code?: number }) => {
        if (err.code !== 11000) throw err;
      },
    );

    if (input.email) {
      const users = await User.find({ _id: { $in: unique }, isActive: true })
        .select("email")
        .lean();
      await Promise.all(
        users.map((u) =>
          sendNotificationEmail(u.email, input.title, input.message),
        ),
      );
    }
  } catch (err) {
    console.error("[notify] Failed:", (err as Error).message);
  }
}

/** Notify the login account linked to an employee record (if any). */
export async function notifyEmployee(
  employeeId: Id,
  input: NotificationInput,
): Promise<void> {
  try {
    await connectDB();
    const emp = await Employee.findById(employeeId).select("userId").lean();
    if (emp?.userId) await notifyUsers([emp.userId], input);
  } catch (err) {
    console.error("[notify] Employee lookup failed:", (err as Error).message);
  }
}

/** Notify every active admin, plus HR users when HR holds the permission. */
export async function notifyPermissionHolders(
  permission: Permission,
  input: NotificationInput,
  excludeUserId?: string,
): Promise<void> {
  try {
    await connectDB();
    const roles: Role[] = ["admin"];
    if ((await getPermissionsForRole("hr")).includes(permission))
      roles.push("hr");
    if ((await getPermissionsForRole("employee")).includes(permission))
      roles.push("employee");

    const users = await User.find({ role: { $in: roles }, isActive: true })
      .select("_id")
      .lean();
    await notifyUsers(
      users
        .map((u) => u._id.toString())
        .filter((id) => id !== excludeUserId),
      input,
    );
  } catch (err) {
    console.error("[notify] Broadcast failed:", (err as Error).message);
  }
}
