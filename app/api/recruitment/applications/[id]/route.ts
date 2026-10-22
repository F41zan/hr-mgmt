/**
 * GET   /api/recruitment/applications/[id] — Application with status history and interviews
 * PATCH /api/recruitment/applications/[id] — { status?, note?, rating?, notes? }
 * Requires recruitment.manage.
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { apiGuard } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import Application from "@/lib/models/Application";
import Interview from "@/lib/models/Interview";
import "@/lib/models/JobOpening";
import "@/lib/models/User";
import { APPLICATION_STATUS, STATUS_TRANSITIONS } from "@/lib/recruitmentConstants";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  status: z.enum(APPLICATION_STATUS).optional(),
  note: z.string().trim().max(500).optional(),
  rating: z.coerce.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().trim().max(5000).optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await apiGuard(PERMISSIONS.RECRUITMENT_MANAGE);
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Invalid ID." }, { status: 400 });

  await connectDB();
  const [application, interviews] = await Promise.all([
    Application.findById(id)
      .populate("jobId", "title status departmentId")
      .populate("statusHistory.changedBy", "name")
      .lean(),
    Interview.find({ applicationId: id })
      .sort({ round: 1, scheduledAt: 1 })
      .populate("interviewers", "name email")
      .lean(),
  ]);
  if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  return NextResponse.json({ application, interviews });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await apiGuard(PERMISSIONS.RECRUITMENT_MANAGE);
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
  const { status, note, rating, notes } = parsed.data;

  await connectDB();
  const app = await Application.findById(id);
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  const previous = app.status;
  if (status && status !== app.status) {
    if (!STATUS_TRANSITIONS[app.status].includes(status))
      return NextResponse.json(
        { error: `Cannot move an application from "${app.status}" to "${status}".` },
        { status: 409 },
      );
    app.status = status;
    app.statusHistory.push({
      status,
      changedBy: new mongoose.Types.ObjectId(guard.session.userId),
      changedAt: new Date(),
      note,
    });
  }
  if (rating !== undefined) app.rating = rating ?? undefined;
  if (notes !== undefined) app.notes = notes;
  await app.save();

  if (status && status !== previous)
    await logAudit({
      session: guard.session,
      req,
      action: "recruitment.application_status",
      entity: "Application",
      entityId: id,
      summary: `${app.candidate.firstName} ${app.candidate.lastName}: ${previous} → ${status}`,
      details: note ? { note } : undefined,
    });

  return NextResponse.json({ success: true, status: app.status });
}
