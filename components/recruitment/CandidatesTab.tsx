"use client";

import { useCallback, useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import { apiFetch, formatDateShort } from "@/lib/apiClient";
import {
  APPLICATION_SOURCES,
  APPLICATION_STATUS,
  RESUME_MAX_BYTES,
  RESUME_TYPES,
} from "@/lib/recruitmentConstants";
import ApplicationDetail from "./ApplicationDetail";
import type { ApplicationRow, JobRow } from "./types";

interface ListResponse {
  applications: ApplicationRow[];
  statusCounts: Record<string, number>;
  pagination: { page: number; pages: number; total: number };
}

export default function CandidatesTab({ initialJobId }: { initialJobId: string }) {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [filters, setFilters] = useState({ jobId: initialJobId, status: "", search: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ jobs: JobRow[] }>("/api/recruitment/jobs").then((d) => setJobs(d.jobs)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ page: String(page), limit: "15" });
    Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
    try {
      setError("");
      setData(await apiFetch<ListResponse>(`/api/recruitment/applications?${qs}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [filters, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const setFilter = (k: keyof typeof filters, v: string) => {
    setPage(1);
    setFilters((f) => ({ ...f, [k]: v }));
  };

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" message={error} />}
      {success && <Alert variant="success" message={success} />}

      <div className="stat-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input className="form-input" placeholder="Search name, email, company" value={filters.search} onChange={(e) => setFilter("search", e.target.value)} />
        <select className="form-input" value={filters.jobId} onChange={(e) => setFilter("jobId", e.target.value)}>
          <option value="">All job openings</option>
          {jobs.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
        </select>
        <select className="form-input" value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
          <option value="">All statuses</option>
          {APPLICATION_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn-primary" onClick={() => setAdding(true)}>+ Add Candidate</button>
      </div>

      {data && (
        <div className="flex flex-wrap gap-2">
          {APPLICATION_STATUS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter("status", filters.status === s ? "" : s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filters.status === s
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                  : "bg-white border-[var(--color-primary-border)] text-[var(--color-text-secondary)]"
              }`}
            >
              {s} · {data.statusCounts[s] ?? 0}
            </button>
          ))}
        </div>
      )}

      <div className="stat-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-primary-light)] text-left">
                {["Candidate", "Job", "Experience", "Source", "Resume", "Applied", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-primary-border)]">
              {!data ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">Loading…</td></tr>
              ) : data.applications.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">No candidates found</td></tr>
              ) : (
                data.applications.map((a) => (
                  <tr key={a._id} className="hover:bg-[var(--color-primary-light)] cursor-pointer" onClick={() => setOpenId(a._id)}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--color-primary)]">{a.candidate.firstName} {a.candidate.lastName}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{a.candidate.email}</p>
                    </td>
                    <td className="px-4 py-3">{a.jobId?.title ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {a.experienceYears !== undefined ? `${a.experienceYears} yrs` : "—"}
                      {a.currentCompany && <span className="block text-xs">{a.currentCompany}</span>}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{a.source.replace("_", " ")}</td>
                    <td className="px-4 py-3">
                      {a.resume ? (
                        <a
                          href={`/api/recruitment/applications/${a._id}/resume`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-xs text-[var(--color-text-secondary)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)] whitespace-nowrap">{formatDateShort(a.createdAt)}</td>
                    <td className="px-4 py-3"><Badge value={a.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data && <Pagination {...data.pagination} page={page} onChange={setPage} />}
      </div>

      {adding && (
        <AddCandidateModal
          jobs={jobs.filter((j) => j.status !== "closed")}
          defaultJobId={filters.jobId}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            setSuccess("Candidate added.");
            load();
          }}
        />
      )}
      {openId && (
        <ApplicationDetail
          id={openId}
          onClose={() => setOpenId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function AddCandidateModal({
  jobs,
  defaultJobId,
  onClose,
  onSaved,
}: {
  jobs: JobRow[];
  defaultJobId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const file = form.get("resume") as File | null;
    if (file && file.size > 0) {
      if (!RESUME_TYPES[file.type]) return setError("Resume must be a PDF, DOC or DOCX file.");
      if (file.size > RESUME_MAX_BYTES) return setError("Resume must be 5 MB or smaller.");
    }
    setLoading(true);
    try {
      await apiFetch("/api/recruitment/applications", { method: "POST", body: form });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <Modal title="Add Candidate" onClose={onClose} size="lg">
      {error && <Alert variant="error" message={error} className="mb-4" />}
      {jobs.length === 0 ? (
        <Alert variant="warning" message="Create an open job opening first." />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="form-label" htmlFor="jobId">Job opening *</label>
            <select id="jobId" name="jobId" className="form-input" defaultValue={defaultJobId} required>
              <option value="">Select job</option>
              {jobs.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field name="firstName" label="First name *" required />
            <Field name="lastName" label="Last name *" required />
            <Field name="email" label="Email *" type="email" required />
            <Field name="phone" label="Phone" />
            <Field name="currentCompany" label="Current company" />
            <Field name="experienceYears" label="Experience (years)" type="number" />
            <Field name="expectedSalary" label="Expected annual salary (₹)" type="number" />
            <Field name="noticePeriodDays" label="Notice period (days)" type="number" />
            <div>
              <label className="form-label" htmlFor="source">Source</label>
              <select id="source" name="source" className="form-input" defaultValue="website">
                {APPLICATION_SOURCES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="resume">Resume (PDF/DOC/DOCX, ≤ 5 MB)</label>
              <input id="resume" name="resume" type="file" accept=".pdf,.doc,.docx" className="form-input" />
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="coverLetter">Cover letter / notes from candidate</label>
            <textarea id="coverLetter" name="coverLetter" rows={3} className="form-input" />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Saving…" : "Add candidate"}</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function Field({ name, label, type = "text", required }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="form-label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} min={type === "number" ? 0 : undefined} className="form-input" required={required} />
    </div>
  );
}
