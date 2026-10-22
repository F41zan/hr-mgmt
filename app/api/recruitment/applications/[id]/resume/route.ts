/**
 * GET /api/recruitment/applications/[id]/resume — Download the candidate's resume.
 * Requires recruitment.manage, or being an interviewer on this application.
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { apiGuard } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import Application from "@/lib/models/Application";
import Interview from "@/lib/models/Interview";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await apiGuard();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Invalid ID." }, { status: 400 });

  await connectDB();
  if (!guard.can(PERMISSIONS.RECRUITMENT_MANAGE)) {
    const isInterviewer = await Interview.exists({
      applicationId: id,
      interviewers: new mongoose.Types.ObjectId(guard.session.userId),
    });
    if (!isInterviewer) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const app = await Application.findById(id).select("+resume.data").lean();
  if (!app?.resume?.data)
    return NextResponse.json({ error: "No resume uploaded for this application." }, { status: 404 });

  const data = app.resume.data as unknown as { buffer?: ArrayBuffer } | Buffer;
  const bytes = Buffer.isBuffer(data)
    ? data
    : Buffer.from((data as { buffer: ArrayBuffer }).buffer);

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": app.resume.contentType,
      "Content-Disposition": `attachment; filename="${app.resume.filename.replace(/"/g, "")}"`,
      "Content-Length": String(bytes.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
