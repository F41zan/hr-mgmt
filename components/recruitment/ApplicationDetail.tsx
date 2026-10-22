"use client";

import { useCallback, useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { apiFetch, formatCurrency, formatDateShort, formatDateTime } from "@/lib/apiClient";
import { STATUS_TRANSITIONS, type ApplicationStatus } from "@/lib/recruitmentConstants";
import ScheduleInterviewModal from "./ScheduleInterviewModal";
import InterviewOutcomeModal from "./InterviewOutcomeModal";
import type { ApplicationRow, InterviewRow } from "./types";

export default function ApplicationDetail({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [app, setApp] = useState<ApplicationRow | null>(null);
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);
  const [error, setError] = useState("");
  const [nextStatus, setNextStatus] = useState<ApplicationStatus | "">("");
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [editingInterview, setEditingInterview] = useState<InterviewRow | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await apiFetch<{ application: ApplicationRow; interviews: InterviewRow[] }>(
        `/api/recruitment/applications/${id}`,
      );
      setApp(d.application);
      setNotes(d.application.notes ?? "");
      setInterviews(d.interviews);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/api/recruitment/applications/${id}`, { method: "PATCH", json: body });
      setNextStatus("");
      setNote("");
      await load();
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const name = app ? `${app.candidate.firstName} ${app.candidate.lastName}` : "Candidate";
  const transitions = app ? STATUS_TRANSITIONS[app.status] : [];
  const canSchedule = app && !["hired", "rejected", "withdrawn"].includes(app.status);

  return (
    <Modal title={name} onClose={onClose} size="xl">
      {error && <Alert variant="error" message={error} className="mb-4" />}
      {!app ? (
        <p className="text-[var(--color-text-secondary)]">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: profile + pipeline */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge value={app.status} />
              <span className="text-sm text-[var(--color-text-secondary)]">
                Applied for <strong className="text-[var(--color-text)]">{app.jobId?.title}</strong> on {formatDateShort(app.createdAt)}
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ["Email", app.candidate.email],
                ["Phone", app.candidate.phone || "—"],
                ["Current company", app.currentCompany || "—"],
                ["Experience", app.experienceYears !== undefined ? `${app.experienceYears} years` : "—"],
                ["Expected salary", app.expectedSalary ? `${formatCurrency(app.expectedSalary)} / yr` : "—"],
                ["Notice period", app.noticePeriodDays !== undefined ? `${app.noticePeriodDays} days` : "—"],
                ["Source", app.source.replace("_", " ")],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-[var(--color-text-secondary)]">{k}</dt>
                  <dd className="font-medium break-all">{v}</dd>
                </div>
              ))}
              <div>
                <dt className="text-xs text-[var(--color-text-secondary)]">Resume</dt>
                <dd>
                  {app.resume ? (
                    <a className="font-semibold text-[var(--color-primary)] hover:underline" href={`/api/recruitment/applications/${app._id}/resume`}>
                      {app.resume.filename} ({Math.ceil(app.resume.size / 1024)} KB)
                    </a>
                  ) : "Not uploaded"}
                </dd>
              </div>
            </dl>

            {app.coverLetter && (
              <div>
                <p className="form-label">Cover letter</p>
                <p className="text-sm whitespace-pre-line bg-[var(--color-primary-light)] rounded-lg p-3">{app.coverLetter}</p>
              </div>
            )}

            {/* Interviews */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold">Interviews</p>
                {canSchedule && (
                  <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setScheduling(true)}>+ Schedule interview</button>
                )}
              </div>
              {interviews.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)]">No interviews scheduled yet.</p>
              ) : (
                <ul className="space-y-2">
                  {interviews.map((iv) => (
                    <li key={iv._id} className="border border-[var(--color-primary-border)] rounded-lg p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold">Round {iv.round} · {iv.type}</span>
                        <div className="flex items-center gap-2">
                          {iv.result && <Badge value={iv.result === "pass" ? "approved" : iv.result === "fail" ? "rejected" : "pending"} label={iv.result} />}
                          <Badge value={iv.status} />
                        </div>
                      </div>
                      <p className="text-[var(--color-text-secondary)] mt-1">
                        {formatDateTime(iv.scheduledAt)} · {iv.durationMinutes} min {iv.location && `· ${iv.location}`}
                      </p>
                      <p className="text-[var(--color-text-secondary)]">With {iv.interviewers.map((u) => u.name).join(", ")}</p>
                      {iv.feedback && <p className="mt-2 whitespace-pre-line">“{iv.feedback}”{iv.rating && ` — ${iv.rating}/5`}</p>}
                      <button className="mt-2 text-xs font-semibold text-[var(--color-primary)] hover:underline" onClick={() => setEditingInterview(iv)}>
                        {iv.status === "scheduled" ? "Reschedule / record outcome" : "Edit feedback"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right: actions + history */}
          <div className="space-y-5">
            <div className="rounded-lg border border-[var(--color-primary-border)] p-4 space-y-3">
              <p className="font-semibold text-sm">Move to stage</p>
              {transitions.length === 0 ? (
                <p className="text-xs text-[var(--color-text-secondary)]">This application is closed.</p>
              ) : (
                <>
                  <select className="form-input" value={nextStatus} onChange={(e) => setNextStatus(e.target.value as ApplicationStatus)}>
                    <option value="">Select status</option>
                    {transitions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <textarea className="form-input" rows={2} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
                  <button className="btn-primary" disabled={!nextStatus || saving} onClick={() => patch({ status: nextStatus, note })}>
                    Update status
                  </button>
                </>
              )}
            </div>

            <div className="rounded-lg border border-[var(--color-primary-border)] p-4 space-y-3">
              <p className="font-semibold text-sm">Rating</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    aria-label={`${n} star`}
                    className={`text-2xl leading-none ${app.rating && n <= app.rating ? "text-yellow-500" : "text-gray-300"}`}
                    onClick={() => patch({ rating: app.rating === n ? null : n })}
                  >
                    ★
                  </button>
                ))}
              </div>
              <p className="font-semibold text-sm pt-2">Recruiter notes</p>
              <textarea className="form-input" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={5000} />
              <button className="btn-secondary w-full" disabled={saving || notes === (app.notes ?? "")} onClick={() => patch({ notes })}>
                Save notes
              </button>
            </div>

            <div>
              <p className="font-semibold text-sm mb-2">Status history</p>
              <ol className="relative border-l border-[var(--color-primary-border)] ml-2 space-y-3">
                {[...(app.statusHistory ?? [])].reverse().map((h, i) => (
                  <li key={i} className="ml-4 text-xs">
                    <span className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-[var(--color-primary)]" />
                    <p className="font-semibold text-sm capitalize">{h.status}</p>
                    <p className="text-[var(--color-text-secondary)]">
                      {formatDateTime(h.changedAt)}{h.changedBy?.name && ` · ${h.changedBy.name}`}
                    </p>
                    {h.note && <p className="mt-0.5">{h.note}</p>}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {scheduling && app && (
        <ScheduleInterviewModal
          applicationId={app._id}
          candidateName={name}
          onClose={() => setScheduling(false)}
          onSaved={() => {
            setScheduling(false);
            load();
            onChanged();
          }}
        />
      )}
      {editingInterview && (
        <InterviewOutcomeModal
          interview={editingInterview}
          canManage
          onClose={() => setEditingInterview(null)}
          onSaved={() => {
            setEditingInterview(null);
            load();
          }}
        />
      )}
    </Modal>
  );
}
