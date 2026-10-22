/**
 * GET    /api/recruitment/jobs/[id] — Job opening details
 * PUT    /api/recruitment/jobs/[id] — Replace job opening fields
 * DELETE /api/recruitment/jobs/[id] — Delete (only when it has no applications; otherwise close it)
 * Requires recruitment.manage.
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { apiGuard } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import JobOpening from "@/lib/models/JobOpening";
import Application from "@/lib/models/Application";
import "@/lib/models/Department";
import "@/lib/models/Designation";
import { jobSchema, toJobDoc } from "../schema";

type Params = { params: Promise<{ id: string }> };

async function resolveId(params: Params["params"]) {
  const { id } = await params;
  return mongoose.Types.ObjectId.isValid(id) ? id : null;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await apiGuard(PERMISSIONS.RECRUITMENT_MANAGE);
  if (guard instanceof NextResponse) return guard;
  const id = await resolveId(params);
  if (!id) return NextResponse.json({ error: "Invalid ID." }, { status: 400 });

  await connectDB();
  const job = await JobOpening.findById(id)
    .populate("departmentId", "name")
    .populate("designationId", "name")
    .populate("createdBy", "name")
    .lean();
  if (!job) return NextResponse.json({ error: "Job opening not found." }, { status: 404 });
  return NextResponse.json({ job });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await apiGuard(PERMISSIONS.RECRUITMENT_MANAGE);
  if (guard instanceof NextResponse) return guard;
  const id = await resolveId(params);
  if (!id) return NextResponse.json({ error: "Invalid ID." }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = jobSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );

  await connectDB();
  const doc = toJobDoc(parsed.data);
  const job = await JobOpening.findByIdAndUpdate(
    id,
    {
      $set: doc,
      $unset: {
        ...(doc.closingDate ? {} : { closingDate: 1 }),
        ...(doc.designationId ? {} : { designationId: 1 }),
      },
    },
    { new: true, runValidators: true },
  ).lean();
  if (!job) return NextResponse.json({ error: "Job opening not found." }, { status: 404 });

  await logAudit({
    session: guard.session,
    req,
    action: "recruitment.job_update",
    entity: "JobOpening",
    entityId: id,
    summary: `Job opening "${job.title}" updated (status: ${job.status})`,
  });
  return NextResponse.json({ job });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await apiGuard(PERMISSIONS.RECRUITMENT_MANAGE);
  if (guard instanceof NextResponse) return guard;
  const id = await resolveId(params);
  if (!id) return NextResponse.json({ error: "Invalid ID." }, { status: 400 });

  await connectDB();
  if (await Application.exists({ jobId: id }))
    return NextResponse.json(
      { error: "This job has applications. Close it instead of deleting." },
      { status: 409 },
    );
  const job = await JobOpening.findByIdAndDelete(id).lean();
  if (!job) return NextResponse.json({ error: "Job opening not found." }, { status: 404 });

  await logAudit({
    session: guard.session,
    req,
    action: "recruitment.job_delete",
    entity: "JobOpening",
    entityId: id,
    summary: `Job opening "${job.title}" deleted`,
  });
  return NextResponse.json({ success: true });
}
