/**
 * GET /api/auth/me
 * Return the currently authenticated user's safe profile.
 */

import { NextResponse } from "next/server";
import { getVerifiedSession } from "@/lib/dal";

export async function GET() {
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  return NextResponse.json({ user: session.user });
}
