/**
 * GET  /api/recruitment/applications — List applications (filters: jobId, status, search, page)
 * POST /api/recruitment/applications — Add a candidate application (multipart/form-data,
 *                                      optional `resume` file: PDF/DOC/DOCX ≤ 5 MB)
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
import JobOpening from "@/lib/models/JobOpening";
import {
  APPLICATION_SOURCES,
  APPLICATION_STATUS,
  RESUME_MAX_BYTES,
  RESUME_TYPES,
} from "@/lib/recruitmentConstants";

const optionalNumber = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z.coerce.number().min(0).optional(),
);

const applicationSchema = z.object({
  jobId: z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), "Select a job opening"),
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().email("Invalid email address"),
  phone: z.string().trim().max(30).optional(),
  experienceYears: optionalNumber,
  currentCompany: z.string().trim().max(150).optional(),
  expectedSalary: optionalNumber,
  noticePeriodDays: optionalNumber,
  source: z.enum(APPLICATION_SOURCES).default("website"),
  coverLetter: z.string().trim().max(5000).optional(),
});

export async function GET(req: NextRequest) {
  const guard = await apiGuard(PERMISSIONS.RECRUITMENT_MANAGE);
  if (guard instanceof NextResponse) return guard;

  try {
    await connectDB();
    const sp = req.nextUrl.searchParams;
    const page = Math.max(parseInt(sp.get("page") || "1"), 1);
    const limit = Math.min(Math.max(parseInt(sp.get("limit") || "20"), 1), 100);
    const jobId = sp.get("jobId");
    const status = sp.get("status");
    const search = sp.get("search")?.trim();

    const query: Record<string, unknown> = {};
    if (jobId && mongoose.Types.ObjectId.isValid(jobId)) query.jobId = new mongoose.Types.ObjectId(jobId);
    if (status && (APPLICATION_STATUS as readonly string[]).includes(status)) query.status = status;
    if (search) {
      const rx = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
      query.$or = [
        { "candidate.firstName": rx },
        { "candidate.lastName": rx },
        { "candidate.email": rx },
        { currentCompany: rx },
      ];
    }

    const [total, applications, statusCounts] = await Promise.all([
      Application.countDocuments(query),
      Application.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-statusHistory -coverLetter -notes")
        .populate("jobId", "title status")
        .lean(),
      Application.aggregate<{ _id: string; n: number }>([
        { $match: { ...query, status: { $exists: true } } },
        { $group: { _id: "$status", n: { $sum: 1 } } },
      ]),
    ]);

    return NextResponse.json({
      applications,
      statusCounts: Object.fromEntries(statusCounts.map((s) => [s._id, s.n])),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[applications GET]", (err as Error).message);
    return NextResponse.json({ error: "Failed to load applications." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await apiGuard(PERMISSIONS.RECRUITMENT_MANAGE);
  if (guard instanceof NextResponse) return guard;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const fields = Object.fromEntries(
    [...form.entries()].filter(([, v]) => typeof v === "string"),
  );
  const parsed = applicationSchema.safeParse(fields);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  const data = parsed.data;

  // Resume (optional)
  let resume: { filename: string; contentType: string; size: number; data: Buffer } | undefined;
  const file = form.get("resume");
  if (file && typeof file !== "string" && file.size > 0) {
    if (!RESUME_TYPES[file.type])
      return NextResponse.json({ error: "Resume must be a PDF, DOC or DOCX file." }, { status: 400 });
    if (file.size > RESUME_MAX_BYTES)
      return NextResponse.json({ error: "Resume must be 5 MB or smaller." }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    // Verify the bytes match the declared type (PDF magic "%PDF", DOCX is a zip "PK", DOC is OLE "D0CF")
    const magic = buffer.subarray(0, 4).toString("hex");
    const ok =
      (file.type === "application/pdf" && magic === "25504446") ||
      (file.type.includes("openxml") && magic.startsWith("504b")) ||
      (file.type === "application/msword" && magic === "d0cf11e0");
    if (!ok) return NextResponse.json({ error: "Resume file content does not match its type." }, { status: 400 });

    resume = {
      filename: file.name.replace(/[^\w.\- ]/g, "_").slice(0, 150) || `resume${RESUME_TYPES[file.type]}`,
      contentType: file.type,
      size: file.size,
      data: buffer,
    };
  }

  try {
    await connectDB();
    const job = await JobOpening.findById(data.jobId).select("title status").lean();
    if (!job) return NextResponse.json({ error: "Job opening not found." }, { status: 404 });
    if (job.status === "closed")
      return NextResponse.json({ error: "This job opening is closed." }, { status: 409 });

    const app = await Application.create({
      jobId: data.jobId,
      candidate: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        phone: data.phone,
      },
      experienceYears: data.experienceYears,
      currentCompany: data.currentCompany,
      expectedSalary: data.expectedSalary,
      noticePeriodDays: data.noticePeriodDays,
      source: data.source,
      coverLetter: data.coverLetter,
      resume,
      status: "applied",
      statusHistory: [{ status: "applied", changedBy: guard.session.userId, changedAt: new Date() }],
      createdBy: guard.session.userId,
    });

    await logAudit({
      session: guard.session,
      req,
      action: "recruitment.application_create",
      entity: "Application",
      entityId: app._id.toString(),
      summary: `Application from ${data.firstName} ${data.lastName} added for "${job.title}"`,
    });

    return NextResponse.json({ application: { _id: app._id } }, { status: 201 });
  } catch (err) {
    if ((err as { code?: number }).code === 11000)
      return NextResponse.json(
        { error: "This candidate has already applied for this job." },
        { status: 409 },
      );
    console.error("[applications POST]", (err as Error).message);
    return NextResponse.json({ error: "Failed to save application." }, { status: 500 });
  }
}
