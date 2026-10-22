/**
 * lib/audit.ts
 * Write entries to the audit trail. Never throws — auditing must not break
 * the request that triggered it.
 */

import "server-only";
import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import AuditLog from "@/lib/models/AuditLog";
import type { VerifiedSession } from "@/lib/dal";

export interface AuditEntry {
  session?: VerifiedSession | null;
  /** Actor for requests without a session yet (e.g. login). */
  actor?: { id?: string; name?: string; role?: string };
  action: string;
  entity: string;
  entityId?: string;
  summary: string;
  details?: Record<string, unknown>;
  req?: NextRequest;
}

export function getClientIp(req?: NextRequest): string | undefined {
  if (!req) return undefined;
  const forwarded = req.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined
  );
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      actorId: entry.session?.userId ?? entry.actor?.id,
      actorName: entry.session?.user.name ?? entry.actor?.name,
      actorRole: entry.session?.role ?? entry.actor?.role,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      summary: entry.summary,
      details: entry.details,
      ip: getClientIp(entry.req),
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", (err as Error).message);
  }
}
