/**
 * GET  /api/recruitment/interviews
 *        recruitment.manage: all (filters: applicationId, status, upcoming=true, from, to)
 *        others / ?scope=mine: interviews where the caller is an interviewer
 * POST /api/recruitment/interviews — Schedule an interview (recruitment.manage)
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { apiGuard } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import Interview from "@/lib/models/Interview";
import Application from "@/lib/models/Application";
import User from "@/lib/models/User";
import "@/lib/models/JobOpening";
import { INTERVIEW_STATUS, INTERVIEW_TYPES } from "@/lib/recruitmentConstants";
import { notifyInterviewScheduled } from "@/lib/recruitmentService";

const objectId = z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), "Invalid ID");

const scheduleSchema = z.object({
  applicationId: objectId,
  type: z.enum(INTERVIEW_TYPES).default("video"),
  scheduledAt: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), "Invalid date/time")
    .refine((v) => Date.parse(v) > Date.now(), "Interview must be scheduled in the future"),
  durationMinutes: z.coerce.number().int().min(15).max(480).default(60),
  location: z.string().trim().max(500).optional(),
  interviewers: z.array(objectId).min(1, "Select at least one interviewer").max(10),
});

export async function GET(req: NextRequest) {
  const guard = await apiGuard();
  if (guard instanceof NextResponse) return guard;

  try {
    await connectDB();
    const sp = req.nextUrl.searchParams;
    const mine = sp.get("scope") === "mine" || !guard.can(PERMISSIONS.RECRUITMENT_MANAGE);
    const query: Record<string, unknown> = {};

    if (mine) query.interviewers = new mongoose.Types.ObjectId(guard.session.userId);

    const applicationId = sp.get("applicationId");
    if (applicationId && mongoose.Types.ObjectId.isValid(applicationId)) query.applicationId = applicationId;
    const status = sp.get("status");
    if (status && (INTERVIEW_STATUS as readonly string[]).includes(status)) query.status = status;

    const range: Record<string, Date> = {};
    if (sp.get("upcoming") === "true") range.$gte = new Date();
    const from = sp.get("from");
    const to = sp.get("to");
    if (from && !isNaN(Date.parse(from))) range.$gte = new Date(from);
    if (to && !isNaN(Date.parse(to))) range.$lte = new Date(to);
    if (Object.keys(range).length) query.scheduledAt = range;

    const interviews = await Interview.find(query)
      .sort({ scheduledAt: sp.get("upcoming") === "true" ? 1 : -1 })
      .limit(200)
      .populate("interviewers", "name email")
      .populate("applicationId", "candidate status resume.filename")
      .populate("jobId", "title")
      .lean();

    return NextResponse.json({ interviews });
  } catch (err) {
    console.error("[interviews GET]", (err as Error).message);
    return NextResponse.json({ error: "Failed to load interviews." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await apiGuard(PERMISSIONS.RECRUITMENT_MANAGE);
  if (guard instanceof NextResponse) return guard;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  const data = parsed.data;

  try {
    await connectDB();
    const app = await Application.findById(data.applicationId);
    if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    if (["hired", "rejected", "withdrawn"].includes(app.status))
      return NextResponse.json(
        { error: `Cannot schedule an interview for a ${app.status} application.` },
        { status: 409 },
      );

    const validInterviewers = await User.countDocuments({ _id: { $in: data.interviewers }, isActive: true });
    if (validInterviewers !== new Set(data.interviewers).size)
      return NextResponse.json({ error: "One or more interviewers are invalid or inactive." }, { status: 400 });

    const lastRound = await Interview.findOne({ applicationId: app._id, status: { $ne: "cancelled" } })
      .sort({ round: -1 })
      .select("round")
      .lean();

    const interview = await Interview.create({
      applicationId: app._id,
      jobId: app.jobId,
      round: (lastRound?.round ?? 0) + 1,
      type: data.type,
      scheduledAt: new Date(data.scheduledAt),
      durationMinutes: data.durationMinutes,
      location: data.location,
      interviewers: [...new Set(data.interviewers)],
      createdBy: guard.session.userId,
    });

    // Move the application into the interview stage
    if (app.status === "applied" || app.status === "screening") {
      app.status = "interview";
      app.statusHistory.push({
        status: "interview",
        changedBy: new mongoose.Types.ObjectId(guard.session.userId),
        changedAt: new Date(),
        note: `Round ${interview.round} interview scheduled`,
      });
      await app.save();
    }

    await Promise.all([
      notifyInterviewScheduled(interview, "scheduled"),
      logAudit({
        session: guard.session,
        req,
        action: "recruitment.interview_schedule",
        entity: "Interview",
        entityId: interview._id.toString(),
        summary: `Round ${interview.round} interview scheduled for ${app.candidate.firstName} ${app.candidate.lastName}`,
      }),
    ]);

    return NextResponse.json({ interview }, { status: 201 });
  } catch (err) {
    console.error("[interviews POST]", (err as Error).message);
    return NextResponse.json({ error: "Failed to schedule interview." }, { status: 500 });
  }
}
