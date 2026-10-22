/**
 * GET   /api/account/profile  — Get own profile (+ linked employee contact details)
 * PATCH /api/account/profile  — Update permitted own profile fields
 *
 * Updatable: name, and — when the account is linked to an employee record —
 * phone, address and emergencyContact.
 * Protected fields (role, isActive, passwordHash, etc.) are stripped server-side.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Employee from "@/lib/models/Employee";
import { getVerifiedSession } from "@/lib/dal";
import { validateName } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

const contactSchema = z.object({
  phone: z.string().trim().max(30).regex(/^[\d+()\-\s]*$/, "Invalid phone number").optional(),
  address: z.string().trim().max(500).optional(),
  emergencyContact: z
    .object({
      name: z.string().trim().max(100),
      relationship: z.string().trim().max(50),
      phone: z.string().trim().max(30).regex(/^[\d+()\-\s]*$/, "Invalid emergency phone number"),
    })
    .optional(),
});

async function getContact(userId: string) {
  const emp = await Employee.findOne({ userId })
    .select("employeeId phone address emergencyContact")
    .lean();
  return emp
    ? {
        employeeId: emp.employeeId,
        phone: emp.phone ?? "",
        address: emp.address ?? "",
        emergencyContact: {
          name: emp.emergencyContact?.name ?? "",
          relationship: emp.emergencyContact?.relationship ?? "",
          phone: emp.emergencyContact?.phone ?? "",
        },
      }
    : null;
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  const session = await getVerifiedSession();
  if (!session)
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });

  await connectDB();
  return NextResponse.json({ user: session.user, contact: await getContact(session.userId) });
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await getVerifiedSession();
  if (!session)
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const hasName = body.name !== undefined;
  if (hasName) {
    const nameErr = validateName(body.name);
    if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 });
  }

  const contact = contactSchema.safeParse(body);
  if (!contact.success) {
    const first = Object.values(contact.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ error: first ?? "Invalid contact details." }, { status: 400 });
  }
  const contactUpdates = Object.fromEntries(
    Object.entries(contact.data).filter(([, v]) => v !== undefined),
  );

  if (!hasName && !Object.keys(contactUpdates).length)
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  try {
    await connectDB();

    let user = null;
    if (hasName) {
      user = await User.findByIdAndUpdate(
        session.userId,
        { $set: { name: (body.name as string).trim() } },
        { new: true, runValidators: true },
      ).select("-passwordHash -resetTokenHash -resetTokenExpiry -resetTokenUsed");
      if (!user) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }
    }

    if (Object.keys(contactUpdates).length) {
      const emp = await Employee.findOneAndUpdate(
        { userId: session.userId },
        { $set: contactUpdates },
        { runValidators: true },
      );
      if (!emp)
        return NextResponse.json(
          { error: "Your account is not linked to an employee record." },
          { status: 404 },
        );
    }

    await logAudit({
      session,
      req,
      action: "account.profile_update",
      entity: "User",
      entityId: session.userId,
      summary: "Updated own profile",
      details: { fields: [...(hasName ? ["name"] : []), ...Object.keys(contactUpdates)] },
    });

    const u = user ?? session.user;
    return NextResponse.json({
      user: {
        id: "id" in u ? u.id : session.userId,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
      },
      contact: await getContact(session.userId),
    });
  } catch (err) {
    console.error("[account/profile PATCH] Error:", (err as Error).message);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 },
    );
  }
}
