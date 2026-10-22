"use client";

import { useCallback, useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import Pagination from "@/components/ui/Pagination";
import { apiFetch, formatDateTime } from "@/lib/apiClient";

interface LogRow {
  _id: string;
  actorName?: string;
  actorRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  summary: string;
  details?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}

const AREAS = [
  { id: "", label: "All activity" },
  { id: "auth", label: "Sign-in" },
  { id: "user", label: "User accounts" },
  { id: "employee", label: "Employees" },
  { id: "leave", label: "Leave" },
  { id: "payroll", label: "Payroll" },
  { id: "recruitment", label: "Recruitment" },
  { id: "settings", label: "Settings" },
  { id: "account", label: "Profile" },
];

export default function AuditLogViewer() {
  const [filters, setFilters] = useState({ action: "", search: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ logs: LogRow[]; pagination: { page: number; pages: number; total: number } } | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));

  const load = useCallback(async () => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    q.set("page", String(page));
    try {
      setError("");
      setData(await apiFetch(`/api/audit-logs?${q}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [filters, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const set = (k: keyof typeof filters, v: string) => {
    setPage(1);
    setFilters((f) => ({ ...f, [k]: v }));
  };

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" message={error} />}
      <div className="stat-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <div>
          <label className="form-label" htmlFor="al-area">Area</label>
          <select id="al-area" className="form-input" value={filters.action} onChange={(e) => set("action", e.target.value)}>
            {AREAS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="al-search">Search</label>
          <input id="al-search" className="form-input" placeholder="User, summary, IP" value={filters.search} onChange={(e) => set("search", e.target.value)} />
        </div>
        <div>
          <label className="form-label" htmlFor="al-from">From</label>
          <input id="al-from" type="date" className="form-input" value={filters.from} onChange={(e) => set("from", e.target.value)} />
        </div>
        <div>
          <label className="form-label" htmlFor="al-to">To</label>
          <input id="al-to" type="date" className="form-input" value={filters.to} onChange={(e) => set("to", e.target.value)} />
        </div>
        <a className="btn-secondary text-center" href={`/api/audit-logs?${qs}&format=csv`}>⬇ Export CSV</a>
      </div>

      <div className="stat-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-primary-light)] text-left">
                {["Time", "User", "Action", "Summary", "IP"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-primary-border)]">
              {!data ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">Loading…</td></tr>
              ) : data.logs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">No audit entries</td></tr>
              ) : (
                data.logs.map((l) => (
                  <tr key={l._id} className="align-top hover:bg-[var(--color-primary-light)]">
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--color-text-secondary)]">{formatDateTime(l.createdAt)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{l.actorName ?? "Anonymous"}</p>
                      {l.actorRole && <p className="text-xs text-[var(--color-text-secondary)] uppercase">{l.actorRole}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <code className={`text-xs px-1.5 py-0.5 rounded ${l.action.includes("fail") ? "bg-red-50 text-red-700" : "bg-gray-100"}`}>{l.action}</code>
                    </td>
                    <td className="px-4 py-3">
                      {l.summary}
                      {l.details && (
                        <>
                          <button className="ml-2 text-xs text-[var(--color-primary)] hover:underline" onClick={() => setExpanded(expanded === l._id ? null : l._id)}>
                            {expanded === l._id ? "hide" : "details"}
                          </button>
                          {expanded === l._id && (
                            <pre className="mt-2 text-xs bg-gray-50 rounded p-2 overflow-x-auto max-w-lg">{JSON.stringify(l.details, null, 2)}</pre>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)] whitespace-nowrap">{l.ip ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data && <Pagination {...data.pagination} page={page} onChange={setPage} />}
      </div>
    </div>
  );
}
