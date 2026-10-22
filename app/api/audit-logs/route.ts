/**
 * GET /api/audit-logs — Audit trail (audit.view)
 * Filters: search, action (prefix, e.g. "leave"), from, to (YYYY-MM-DD), page, limit, format=csv
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { apiGuard } from "@/lib/access";
import { PERMISSIONS } from "@/lib/permissions";
import AuditLog from "@/lib/models/AuditLog";
import { isValidDateString } from "@/lib/utils/dates";
import { toCsv } from "@/lib/utils/csv";

export async function GET(req: NextRequest) {
  const guard = await apiGuard(PERMISSIONS.AUDIT_VIEW);
  if (guard instanceof NextResponse) return guard;

  try {
    await connectDB();
    const sp = req.nextUrl.searchParams;
    const page = Math.max(parseInt(sp.get("page") || "1"), 1);
    const limit = Math.min(Math.max(parseInt(sp.get("limit") || "25"), 1), 100);
    const search = sp.get("search")?.trim();
    const action = sp.get("action")?.trim();
    const from = sp.get("from");
    const to = sp.get("to");

    const query: Record<string, unknown> = {};
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (action) query.action = { $regex: `^${esc(action)}` };
    if (search) {
      const rx = { $regex: esc(search), $options: "i" };
      query.$or = [{ summary: rx }, { actorName: rx }, { entity: rx }, { ip: rx }];
    }
    const range: Record<string, Date> = {};
    if (isValidDateString(from)) range.$gte = new Date(`${from}T00:00:00+05:30`);
    if (isValidDateString(to)) range.$lte = new Date(`${to}T23:59:59.999+05:30`);
    if (Object.keys(range).length) query.createdAt = range;

    if (sp.get("format") === "csv") {
      const rows = await AuditLog.find(query).sort({ createdAt: -1 }).limit(10000).lean();
      const csv = toCsv(
        ["Time", "Actor", "Role", "Action", "Entity", "Entity ID", "Summary", "IP"],
        rows.map((r) => [
          r.createdAt.toISOString(),
          r.actorName ?? "",
          r.actorRole ?? "",
          r.action,
          r.entity,
          r.entityId ?? "",
          r.summary,
          r.ip ?? "",
        ]),
      );
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="audit-log.csv"`,
        },
      });
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AuditLog.countDocuments(query),
    ]);

    return NextResponse.json({
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[audit-logs GET]", (err as Error).message);
    return NextResponse.json({ error: "Failed to load audit logs." }, { status: 500 });
  }
}
