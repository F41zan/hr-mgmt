"use client";

import { useState } from "react";
import Alert from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";
import { apiFetch } from "@/lib/apiClient";
import { INTERVIEW_RESULTS, INTERVIEW_TYPES } from "@/lib/recruitmentConstants";
import { InterviewerPicker, toLocalInput } from "./ScheduleInterviewModal";
import type { InterviewRow } from "./types";

/**
 * Record an interview outcome (interviewers and recruiters) and, for recruiters,
 * reschedule or cancel it.
 */
export default function InterviewOutcomeModal({
  interview,
  canManage,
  onClose,
  onSaved,
}: {
  interview: InterviewRow;
  canManage: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<"outcome" | "reschedule">("outcome");
  const [outcome, setOutcome] = useState({
    status: interview.status === "scheduled" ? "completed" : interview.status,
    result: interview.result ?? "",
    rating: interview.rating ? String(interview.rating) : "",
    feedback: interview.feedback ?? "",
  });
  const [schedule, setSchedule] = useState({
    type: interview.type as string,
    scheduledAt: toLocalInput(new Date(interview.scheduledAt)),
    durationMinutes: String(interview.durationMinutes),
    location: interview.location ?? "",
  });
  const [interviewers, setInterviewers] = useState(interview.interviewers.map((u) => u._id));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(body: Record<string, unknown>) {
    setError("");
    setLoading(true);
    try {
      await apiFetch(`/api/recruitment/interviews/${interview._id}`, { method: "PATCH", json: body });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  function saveOutcome(e: React.FormEvent) {
    e.preventDefault();
    send({
      status: outcome.status,
      feedback: outcome.feedback,
      ...(outcome.result ? { result: outcome.result } : {}),
      ...(outcome.rating ? { rating: Number(outcome.rating) } : {}),
    });
  }

  function saveSchedule(e: React.FormEvent) {
    e.preventDefault();
    send({ ...schedule, scheduledAt: new Date(schedule.scheduledAt).toISOString(), interviewers });
  }

  const candidate = typeof interview.applicationId === "object" ? interview.applicationId.candidate : null;
  const title = `Round ${interview.round}${candidate ? ` · ${candidate.firstName} ${candidate.lastName}` : ""}`;

  return (
    <Modal title={title} onClose={onClose} size="lg">
      {error && <Alert variant="error" message={error} className="mb-4" />}

      {canManage && interview.status === "scheduled" && (
        <div className="flex gap-2 mb-4">
          {(["outcome", "reschedule"] as const).map((m) => (
            <button
              key={m}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${mode === m ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-primary-light)] text-[var(--color-primary)]"}`}
              onClick={() => setMode(m)}
            >
              {m === "outcome" ? "Record outcome" : "Reschedule"}
            </button>
          ))}
          <button
            className="ml-auto px-3 py-1.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50"
            disabled={loading}
            onClick={() => confirm("Cancel this interview? Interviewers and the candidate will be informed.") && send({ status: "cancelled" })}
          >
            Cancel interview
          </button>
        </div>
      )}

      {mode === "outcome" ? (
        <form onSubmit={saveOutcome} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label" htmlFor="ostatus">Status</label>
              <select id="ostatus" className="form-input" value={outcome.status} onChange={(e) => setOutcome({ ...outcome, status: e.target.value as typeof outcome.status })}>
                <option value="completed">Completed</option>
                <option value="no_show">No show</option>
                {canManage && interview.status !== "scheduled" && <option value={interview.status}>{interview.status}</option>}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="oresult">Result</label>
              <select id="oresult" className="form-input" value={outcome.result} onChange={(e) => setOutcome({ ...outcome, result: e.target.value })}>
                <option value="">—</option>
                {INTERVIEW_RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="orating">Rating (1–5)</label>
              <select id="orating" className="form-input" value={outcome.rating} onChange={(e) => setOutcome({ ...outcome, rating: e.target.value })}>
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="ofeedback">Feedback</label>
            <textarea id="ofeedback" rows={5} className="form-input" maxLength={5000} value={outcome.feedback}
              onChange={(e) => setOutcome({ ...outcome, feedback: e.target.value })} />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Saving…" : "Save outcome"}</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
          </div>
        </form>
      ) : (
        <form onSubmit={saveSchedule} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label" htmlFor="rtype">Type</label>
              <select id="rtype" className="form-input" value={schedule.type} onChange={(e) => setSchedule({ ...schedule, type: e.target.value })}>
                {INTERVIEW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="rwhen">Date & time</label>
              <input id="rwhen" type="datetime-local" className="form-input" value={schedule.scheduledAt}
                min={toLocalInput(new Date())} onChange={(e) => setSchedule({ ...schedule, scheduledAt: e.target.value })} required />
            </div>
            <div>
              <label className="form-label" htmlFor="rdur">Duration (min)</label>
              <input id="rdur" type="number" min={15} max={480} step={15} className="form-input" value={schedule.durationMinutes}
                onChange={(e) => setSchedule({ ...schedule, durationMinutes: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="rloc">Location or meeting link</label>
            <input id="rloc" className="form-input" value={schedule.location} onChange={(e) => setSchedule({ ...schedule, location: e.target.value })} />
          </div>
          <div>
            <p className="form-label">Interviewers</p>
            <InterviewerPicker selected={interviewers} onChange={setInterviewers} />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={loading || !interviewers.length}>{loading ? "Saving…" : "Reschedule"}</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
