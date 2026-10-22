/**
 * GET /api/recruitment/interviewers — Active user accounts that can be assigned as interviewers.
 * Requires recruitment.manage.
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { apiGuard } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import User from "@/lib/models/User";

export async function GET() {
  const guard = await apiGuard(PERMISSIONS.RECRUITMENT_MANAGE);
  if (guard instanceof NextResponse) return guard;

  await connectDB();
  const users = await User.find({ isActive: true }).select("name email role").sort({ name: 1 }).lean();
  return NextResponse.json({
    users: users.map((u) => ({ id: u._id.toString(), name: u.name, email: u.email, role: u.role })),
  });
}
