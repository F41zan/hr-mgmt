/**
 * GET  /api/recruitment/jobs — Job openings with application counts (filters: status, search, departmentId)
 * POST /api/recruitment/jobs — Create a job opening
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
import Department from "@/lib/models/Department";
import "@/lib/models/Designation";
import { JOB_STATUS } from "@/lib/recruitmentConstants";
import { jobSchema, toJobDoc } from "./schema";

export async function GET(req: NextRequest) {
  const guard = await apiGuard(PERMISSIONS.RECRUITMENT_MANAGE);
  if (guard instanceof NextResponse) return guard;

  try {
    await connectDB();
    const sp = req.nextUrl.searchParams;
    const query: Record<string, unknown> = {};
    const status = sp.get("status");
    const search = sp.get("search")?.trim();
    const departmentId = sp.get("departmentId");
    if (status && (JOB_STATUS as readonly string[]).includes(status)) query.status = status;
    if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) query.departmentId = departmentId;
    if (search) query.title = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

    const jobs = await JobOpening.find(query)
      .sort({ status: 1, createdAt: -1 })
      .populate("departmentId", "name")
      .populate("designationId", "name")
      .lean();

    const counts = await Application.aggregate<{ _id: { jobId: mongoose.Types.ObjectId; status: string }; n: number }>([
      { $match: { jobId: { $in: jobs.map((j) => j._id) } } },
      { $group: { _id: { jobId: "$jobId", status: "$status" }, n: { $sum: 1 } } },
    ]);

    const withCounts = jobs.map((j) => {
      const mine = counts.filter((c) => c._id.jobId.equals(j._id));
      const byStatus = Object.fromEntries(mine.map((c) => [c._id.status, c.n]));
      return { ...j, applicationCount: mine.reduce((s, c) => s + c.n, 0), byStatus };
    });

    return NextResponse.json({ jobs: withCounts });
  } catch (err) {
    console.error("[jobs GET]", (err as Error).message);
    return NextResponse.json({ error: "Failed to load job openings." }, { status: 500 });
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
  const parsed = jobSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );

  try {
    await connectDB();
    if (!(await Department.exists({ _id: parsed.data.departmentId })))
      return NextResponse.json({ error: "Department not found." }, { status: 400 });

    const job = await JobOpening.create({
      ...toJobDoc(parsed.data),
      createdBy: guard.session.userId,
    });
    await logAudit({
      session: guard.session,
      req,
      action: "recruitment.job_create",
      entity: "JobOpening",
      entityId: job._id.toString(),
      summary: `Job opening "${job.title}" created`,
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    console.error("[jobs POST]", (err as Error).message);
    return NextResponse.json({ error: "Failed to create job opening." }, { status: 500 });
  }
}
