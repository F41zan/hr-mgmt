/**
 * PATCH /api/recruitment/interviews/[id]
 *   recruitment.manage: reschedule (scheduledAt, durationMinutes, location, interviewers, type),
 *                       change status, record feedback
 *   assigned interviewers: record feedback / mark completed or no-show
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { apiGuard } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import Interview from "@/lib/models/Interview";
import User from "@/lib/models/User";
import {
  INTERVIEW_RESULTS,
  INTERVIEW_STATUS,
  INTERVIEW_TYPES,
} from "@/lib/recruitmentConstants";
import { notifyInterviewScheduled } from "@/lib/recruitmentService";

type Params = { params: Promise<{ id: string }> };

const objectId = z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), "Invalid ID");

const patchSchema = z.object({
  // scheduling (managers only)
  type: z.enum(INTERVIEW_TYPES).optional(),
  scheduledAt: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid date/time").optional(),
  durationMinutes: z.coerce.number().int().min(15).max(480).optional(),
  location: z.string().trim().max(500).optional(),
  interviewers: z.array(objectId).min(1).max(10).optional(),
  // outcome (managers or interviewers)
  status: z.enum(INTERVIEW_STATUS).optional(),
  feedback: z.string().trim().max(5000).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  result: z.enum(INTERVIEW_RESULTS).optional(),
});

const SCHEDULING_FIELDS = ["type", "scheduledAt", "durationMinutes", "location", "interviewers"] as const;

export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await apiGuard();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Invalid ID." }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  const data = parsed.data;

  await connectDB();
  const interview = await Interview.findById(id);
  if (!interview) return NextResponse.json({ error: "Interview not found." }, { status: 404 });

  const isManager = guard.can(PERMISSIONS.RECRUITMENT_MANAGE);
  const isInterviewer = interview.interviewers.some((u) => u.equals(guard.session.userId));
  if (!isManager && !isInterviewer) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const touchesSchedule = SCHEDULING_FIELDS.some((f) => data[f] !== undefined);
  if (!isManager && (touchesSchedule || data.status === "cancelled" || data.status === "scheduled"))
    return NextResponse.json({ error: "Only recruiters can reschedule or cancel interviews." }, { status: 403 });

  if (touchesSchedule && interview.status !== "scheduled")
    return NextResponse.json({ error: "Only scheduled interviews can be rescheduled." }, { status: 409 });

  const previousTime = interview.scheduledAt.getTime();
  if (data.scheduledAt) {
    const when = new Date(data.scheduledAt);
    if (when.getTime() <= Date.now())
      return NextResponse.json({ error: "Interview must be scheduled in the future." }, { status: 400 });
    interview.scheduledAt = when;
  }
  if (data.interviewers) {
    const unique = [...new Set(data.interviewers)];
    if ((await User.countDocuments({ _id: { $in: unique }, isActive: true })) !== unique.length)
      return NextResponse.json({ error: "One or more interviewers are invalid or inactive." }, { status: 400 });
    interview.interviewers = unique.map((u) => new mongoose.Types.ObjectId(u));
  }
  if (data.type) interview.type = data.type;
  if (data.durationMinutes) interview.durationMinutes = data.durationMinutes;
  if (data.location !== undefined) interview.location = data.location;
  if (data.feedback !== undefined) interview.feedback = data.feedback;
  if (data.rating !== undefined) interview.rating = data.rating;
  if (data.result !== undefined) interview.result = data.result;

  const statusChanged = data.status && data.status !== interview.status;
  if (data.status) interview.status = data.status;

  const rescheduled = interview.scheduledAt.getTime() !== previousTime;
  if (rescheduled) interview.reminderSent = false;

  await interview.save();

  if (rescheduled) await notifyInterviewScheduled(interview, "rescheduled");
  else if (statusChanged && interview.status === "cancelled") await notifyInterviewScheduled(interview, "cancelled");

  await logAudit({
    session: guard.session,
    req,
    action: rescheduled
      ? "recruitment.interview_reschedule"
      : statusChanged
        ? `recruitment.interview_${interview.status}`
        : "recruitment.interview_feedback",
    entity: "Interview",
    entityId: id,
    summary: rescheduled
      ? `Interview round ${interview.round} rescheduled`
      : statusChanged
        ? `Interview round ${interview.round} marked ${interview.status}`
        : `Feedback recorded for interview round ${interview.round}`,
  });

  return NextResponse.json({ interview });
}
