"use client";

import { useCallback, useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { apiFetch, formatCurrency, formatDateShort } from "@/lib/apiClient";
import { JOB_STATUS } from "@/lib/recruitmentConstants";
import type { JobRow, Option } from "./types";

const EMPLOYMENT_TYPES = ["full-time", "part-time", "contract", "intern"];

export default function JobsTab({ onViewCandidates }: { onViewCandidates: (jobId: string) => void }) {
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [status, setStatus] = useState("open");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState<JobRow | "new" | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (search) qs.set("search", search);
    try {
      setError("");
      setJobs((await apiFetch<{ jobs: JobRow[] }>(`/api/recruitment/jobs?${qs}`)).jobs);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [status, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function remove(job: JobRow) {
    if (!confirm(`Delete job opening "${job.title}"?`)) return;
    try {
      await apiFetch(`/api/recruitment/jobs/${job._id}`, { method: "DELETE" });
      setSuccess("Job opening deleted.");
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" message={error} />}
      {success && <Alert variant="success" message={success} />}

      <div className="stat-card p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <input className="form-input sm:max-w-xs" placeholder="Search job title" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="form-input sm:max-w-[180px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {JOB_STATUS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <div className="sm:ml-auto">
          <button className="btn-primary w-auto" onClick={() => setEditing("new")}>+ New Job Opening</button>
        </div>
      </div>

      {!jobs ? (
        <div className="stat-card text-center text-[var(--color-text-secondary)]">Loading…</div>
      ) : jobs.length === 0 ? (
        <div className="stat-card text-center text-[var(--color-text-secondary)] py-10">No job openings found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((j) => (
            <div key={j._id} className="stat-card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[var(--color-text)]">{j.title}</h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {j.departmentId?.name ?? "—"} · {j.employmentType} · {j.location || "Location not set"}
                  </p>
                </div>
                <Badge value={j.status} />
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">{j.description}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)]">
                <span>{j.openings} opening(s)</span>
                {(j.salaryMin || j.salaryMax) && (
                  <span>{formatCurrency(j.salaryMin ?? 0)} – {formatCurrency(j.salaryMax ?? 0)} / yr</span>
                )}
                {j.closingDate && <span>Closes {formatDateShort(j.closingDate)}</span>}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-[var(--color-primary-light)] font-semibold">
                  {j.applicationCount ?? 0} applicant(s)
                </span>
                {Object.entries(j.byStatus ?? {}).map(([s, n]) => (
                  <span key={s} className="px-2 py-1 rounded bg-gray-100 text-gray-700">{s}: {n}</span>
                ))}
              </div>
              <div className="flex gap-3 text-sm font-semibold pt-1 mt-auto">
                <button className="text-[var(--color-primary)] hover:underline" onClick={() => onViewCandidates(j._id)}>View candidates</button>
                <button className="text-[var(--color-text-secondary)] hover:underline" onClick={() => setEditing(j)}>Edit</button>
                {!j.applicationCount && (
                  <button className="text-red-600 hover:underline" onClick={() => remove(j)}>Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <JobModal
          job={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            setSuccess(msg);
            load();
          }}
        />
      )}
    </div>
  );
}

function JobModal({ job, onClose, onSaved }: { job: JobRow | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const [departments, setDepartments] = useState<Option[]>([]);
  const [designations, setDesignations] = useState<Option[]>([]);
  const [form, setForm] = useState({
    title: job?.title ?? "",
    departmentId: job?.departmentId?._id ?? "",
    designationId: job?.designationId?._id ?? "",
    description: job?.description ?? "",
    requirements: job?.requirements ?? "",
    location: job?.location ?? "",
    employmentType: job?.employmentType ?? "full-time",
    openings: String(job?.openings ?? 1),
    experienceMin: job?.experienceMin?.toString() ?? "",
    experienceMax: job?.experienceMax?.toString() ?? "",
    salaryMin: job?.salaryMin?.toString() ?? "",
    salaryMax: job?.salaryMax?.toString() ?? "",
    closingDate: job?.closingDate?.slice(0, 10) ?? "",
    status: job?.status ?? "open",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ departments: Option[] }>("/api/departments?limit=100&status=active")
      .then((d) => setDepartments(d.departments))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!form.departmentId) return;
    apiFetch<{ designations: Option[] }>(`/api/designations?departmentId=${form.departmentId}`)
      .then((d) => setDesignations(d.designations))
      .catch(() => {});
  }, [form.departmentId]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch(job ? `/api/recruitment/jobs/${job._id}` : "/api/recruitment/jobs", {
        method: job ? "PUT" : "POST",
        json: form,
      });
      onSaved(job ? "Job opening updated." : "Job opening created.");
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <Modal title={job ? "Edit Job Opening" : "New Job Opening"} onClose={onClose} size="lg">
      {error && <Alert variant="error" message={error} className="mb-4" />}
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="form-label" htmlFor="title">Job title *</label>
          <input id="title" className="form-input" value={form.title} onChange={set("title")} required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label" htmlFor="dept">Department *</label>
            <select id="dept" className="form-input" value={form.departmentId}
              onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value, designationId: "" }))} required>
              <option value="">Select department</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="desig">Designation</label>
            <select id="desig" className="form-input" value={form.designationId} onChange={set("designationId")}>
              <option value="">—</option>
              {form.departmentId && designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="etype">Employment type</label>
            <select id="etype" className="form-input" value={form.employmentType} onChange={set("employmentType")}>
              {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="loc">Location</label>
            <input id="loc" className="form-input" value={form.location} onChange={set("location")} placeholder="e.g. Mumbai / Remote" />
          </div>
          <div>
            <label className="form-label" htmlFor="openings">Openings</label>
            <input id="openings" type="number" min={1} className="form-input" value={form.openings} onChange={set("openings")} />
          </div>
          <div>
            <label className="form-label" htmlFor="closing">Closing date</label>
            <input id="closing" type="date" className="form-input" value={form.closingDate} onChange={set("closingDate")} />
          </div>
          <div>
            <label className="form-label">Experience (years)</label>
            <div className="flex gap-2">
              <input type="number" min={0} className="form-input" placeholder="Min" value={form.experienceMin} onChange={set("experienceMin")} />
              <input type="number" min={0} className="form-input" placeholder="Max" value={form.experienceMax} onChange={set("experienceMax")} />
            </div>
          </div>
          <div>
            <label className="form-label">Annual salary range (₹)</label>
            <div className="flex gap-2">
              <input type="number" min={0} className="form-input" placeholder="Min" value={form.salaryMin} onChange={set("salaryMin")} />
              <input type="number" min={0} className="form-input" placeholder="Max" value={form.salaryMax} onChange={set("salaryMax")} />
            </div>
          </div>
        </div>
        <div>
          <label className="form-label" htmlFor="desc">Description *</label>
          <textarea id="desc" rows={4} className="form-input" value={form.description} onChange={set("description")} required />
        </div>
        <div>
          <label className="form-label" htmlFor="req">Requirements</label>
          <textarea id="req" rows={3} className="form-input" value={form.requirements} onChange={set("requirements")} />
        </div>
        <div className="sm:max-w-[200px]">
          <label className="form-label" htmlFor="jstatus">Status</label>
          <select id="jstatus" className="form-input" value={form.status} onChange={set("status")}>
            {JOB_STATUS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Saving…" : "Save"}</button>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
