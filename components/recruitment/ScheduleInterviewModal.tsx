"use client";

import { useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";
import { apiFetch } from "@/lib/apiClient";
import { INTERVIEW_TYPES } from "@/lib/recruitmentConstants";

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

/** "YYYY-MM-DDTHH:mm" for a datetime-local input, in the browser's timezone. */
export function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function InterviewerPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    apiFetch<{ users: UserOption[] }>("/api/recruitment/interviewers").then((d) => setUsers(d.users)).catch(() => {});
  }, []);

  const visible = users.filter(
    (u) => !filter || u.name.toLowerCase().includes(filter.toLowerCase()) || u.email.includes(filter.toLowerCase()),
  );

  return (
    <div>
      <input className="form-input mb-2" placeholder="Filter people" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <div className="max-h-40 overflow-y-auto border border-[var(--color-input-border)] rounded-lg divide-y">
        {visible.map((u) => (
          <label key={u.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-[var(--color-primary-light)]">
            <input
              type="checkbox"
              checked={selected.includes(u.id)}
              onChange={(e) => onChange(e.target.checked ? [...selected, u.id] : selected.filter((s) => s !== u.id))}
            />
            <span className="font-medium">{u.name}</span>
            <span className="text-xs text-[var(--color-text-secondary)]">{u.email} · {u.role}</span>
          </label>
        ))}
        {visible.length === 0 && <p className="px-3 py-2 text-sm text-[var(--color-text-secondary)]">No users</p>}
      </div>
    </div>
  );
}

export default function ScheduleInterviewModal({
  applicationId,
  candidateName,
  onClose,
  onSaved,
}: {
  applicationId: string;
  candidateName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(() => {
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    tomorrow.setHours(11, 0, 0, 0);
    return { type: "video", scheduledAt: toLocalInput(tomorrow), durationMinutes: "60", location: "" };
  });
  const [minDate] = useState(() => toLocalInput(new Date()));
  const [interviewers, setInterviewers] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!interviewers.length) return setError("Select at least one interviewer.");
    setError("");
    setLoading(true);
    try {
      await apiFetch("/api/recruitment/interviews", {
        method: "POST",
        json: {
          applicationId,
          ...form,
          scheduledAt: new Date(form.scheduledAt).toISOString(),
          interviewers,
        },
      });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <Modal title={`Schedule interview · ${candidateName}`} onClose={onClose} size="lg">
      {error && <Alert variant="error" message={error} className="mb-4" />}
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="form-label" htmlFor="itype">Type</label>
            <select id="itype" className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {INTERVIEW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="iwhen">Date & time</label>
            <input id="iwhen" type="datetime-local" className="form-input" value={form.scheduledAt}
              min={minDate} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} required />
          </div>
          <div>
            <label className="form-label" htmlFor="idur">Duration (min)</label>
            <input id="idur" type="number" min={15} max={480} step={15} className="form-input" value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="form-label" htmlFor="iloc">Location or meeting link</label>
          <input id="iloc" className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Conference room B / https://meet…" />
        </div>
        <div>
          <p className="form-label">Interviewers</p>
          <InterviewerPicker selected={interviewers} onChange={setInterviewers} />
        </div>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Interviewers are notified now and reminded 24 hours before. The candidate is emailed when SMTP is configured.
        </p>
        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Scheduling…" : "Schedule"}</button>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
