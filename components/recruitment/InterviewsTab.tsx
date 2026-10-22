"use client";

import { useCallback, useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import { apiFetch, formatDateTime } from "@/lib/apiClient";
import { INTERVIEW_STATUS } from "@/lib/recruitmentConstants";
import InterviewOutcomeModal from "./InterviewOutcomeModal";
import type { InterviewRow } from "./types";

/**
 * Interview list. `scope="mine"` shows only interviews the current user is
 * assigned to (used on /recruitment/my-interviews).
 */
export default function InterviewsTab({ scope }: { scope?: "mine" }) {
  const [view, setView] = useState<"upcoming" | "all">("upcoming");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<InterviewRow[] | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<InterviewRow | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (scope) qs.set("scope", scope);
    if (view === "upcoming") {
      qs.set("upcoming", "true");
      qs.set("status", "scheduled");
    } else if (status) qs.set("status", status);
    try {
      setError("");
      setRows((await apiFetch<{ interviews: InterviewRow[] }>(`/api/recruitment/interviews?${qs}`)).interviews);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [scope, view, status]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" message={error} />}
      <div className="stat-card p-4 flex flex-wrap gap-3 items-center">
        {(["upcoming", "all"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${view === v ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-primary-light)] text-[var(--color-primary)]"}`}
          >
            {v === "upcoming" ? "Upcoming" : "All interviews"}
          </button>
        ))}
        {view === "all" && (
          <select className="form-input max-w-[180px]" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {INTERVIEW_STATUS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
        )}
      </div>

      <div className="stat-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-primary-light)] text-left">
                {["When", "Candidate", "Job", "Round", "Interviewers", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-primary-border)]">
              {!rows ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                  {view === "upcoming" ? "No upcoming interviews" : "No interviews found"}
                </td></tr>
              ) : (
                rows.map((iv) => {
                  const app = typeof iv.applicationId === "object" ? iv.applicationId : null;
                  const job = typeof iv.jobId === "object" ? iv.jobId : null;
                  return (
                    <tr key={iv._id} className="hover:bg-[var(--color-primary-light)]">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium">{formatDateTime(iv.scheduledAt)}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{iv.durationMinutes} min{iv.location && ` · ${iv.location}`}</p>
                      </td>
                      <td className="px-4 py-3">
                        {app ? `${app.candidate.firstName} ${app.candidate.lastName}` : "—"}
                        {app?.resume && (
                          <a className="block text-xs text-[var(--color-primary)] hover:underline" href={`/api/recruitment/applications/${app._id}/resume`}>
                            Resume
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">{job?.title ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{iv.round} · {iv.type}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{iv.interviewers.map((u) => u.name).join(", ")}</td>
                      <td className="px-4 py-3">
                        <Badge value={iv.status} />
                        {iv.result && <p className="text-xs mt-1">Result: {iv.result}</p>}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {iv.status !== "cancelled" && (
                          <button className="text-xs font-semibold text-[var(--color-primary)] hover:underline" onClick={() => setEditing(iv)}>
                            {iv.status === "scheduled" ? (scope ? "Give feedback" : "Manage") : "Edit feedback"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <InterviewOutcomeModal
          interview={editing}
          canManage={!scope}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
