"use client";

import { useCallback, useEffect, useState } from "react";
import Tabs from "@/components/ui/Tabs";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import { apiFetch, formatCurrency } from "@/lib/apiClient";
import { calculatePayroll, monthlyGross, type SalaryInput } from "@/lib/utils/payroll";
import { currentMonth, formatMonth } from "@/lib/utils/dates";

export interface PayslipRow {
  _id: string;
  month: string;
  employee: { name: string; code: string; department?: string; designation?: string };
  workingDays: number;
  paidDays: number;
  lopDays: number;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  status: "draft" | "published";
  publishedAt?: string;
}

interface PayslipList {
  payslips: PayslipRow[];
  summary: { gross: number; deductions: number; net: number; count: number; drafts: number } | null;
  pagination: { page: number; pages: number; total: number };
}

type TabId = "payslips" | "salary";

export default function PayrollManagement() {
  const [tab, setTab] = useState<TabId>("payslips");
  return (
    <div>
      <Tabs
        tabs={[
          { id: "payslips", label: "Payroll & Payslips" },
          { id: "salary", label: "Salary Structures" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "payslips" ? <PayslipsTab /> : <SalaryTab />}
    </div>
  );
}

// ── Payslips ──────────────────────────────────────────────────────────────────

function PayslipsTab() {
  const [month, setMonth] = useState(currentMonth());
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PayslipList | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ variant: "success" | "warning"; message: string } | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ month, page: String(page), limit: "20" });
    if (status) qs.set("status", status);
    if (search) qs.set("search", search);
    try {
      setError("");
      setData(await apiFetch<PayslipList>(`/api/payroll/payslips?${qs}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [month, status, search, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function run() {
    if (!confirm(`Generate draft payslips for ${formatMonth(month)}? Existing drafts will be recalculated.`)) return;
    setBusy(true);
    setNotice(null);
    try {
      const r = await apiFetch<{ generated: number; skippedPublished: string[]; missingSalary: string[] }>(
        "/api/payroll/run",
        { method: "POST", json: { month } },
      );
      const parts = [`${r.generated} draft payslip(s) generated.`];
      if (r.skippedPublished.length) parts.push(`${r.skippedPublished.length} already published (unchanged).`);
      if (r.missingSalary.length)
        parts.push(`No salary structure for: ${r.missingSalary.slice(0, 5).join(", ")}${r.missingSalary.length > 5 ? "…" : ""}.`);
      setNotice({ variant: r.missingSalary.length ? "warning" : "success", message: parts.join(" ") });
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function publishAll() {
    if (!confirm(`Publish all draft payslips for ${formatMonth(month)}? Employees will be notified.`)) return;
    setBusy(true);
    try {
      const r = await apiFetch<{ message: string }>("/api/payroll/payslips", {
        method: "PATCH",
        json: { month, action: "publish" },
      });
      setNotice({ variant: "success", message: r.message });
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function act(p: PayslipRow, action: "publish" | "unpublish" | "delete") {
    if (action === "delete" && !confirm(`Delete draft payslip for ${p.employee.name}?`)) return;
    try {
      if (action === "delete") await apiFetch(`/api/payroll/payslips/${p._id}`, { method: "DELETE" });
      else await apiFetch(`/api/payroll/payslips/${p._id}`, { method: "PATCH", json: { action } });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const s = data?.summary;

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" message={error} />}
      {notice && <Alert variant={notice.variant} message={notice.message} />}

      <div className="stat-card p-4 flex flex-col lg:flex-row gap-3 lg:items-end">
        <div>
          <label className="form-label" htmlFor="pay-month">Month</label>
          <input
            id="pay-month"
            type="month"
            className="form-input"
            value={month}
            max={currentMonth()}
            onChange={(e) => { setMonth(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex-1">
          <label className="form-label" htmlFor="pay-search">Search</label>
          <input id="pay-search" className="form-input" placeholder="Name or employee ID" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div>
          <label className="form-label" htmlFor="pay-status">Status</label>
          <select id="pay-status" className="form-input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary w-auto whitespace-nowrap" disabled={busy || !month} onClick={run}>
            {busy ? "Working…" : "Run Payroll"}
          </button>
          <button className="btn-secondary whitespace-nowrap" disabled={busy || !s?.drafts} onClick={publishAll}>
            Publish Drafts{s?.drafts ? ` (${s.drafts})` : ""}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["Payslips", s ? String(s.count) : "0"],
          ["Gross Pay", formatCurrency(s?.gross ?? 0)],
          ["Deductions", formatCurrency(s?.deductions ?? 0)],
          ["Net Pay", formatCurrency(s?.net ?? 0)],
        ].map(([label, value]) => (
          <div key={label} className="stat-card p-4">
            <p className="text-xs font-semibold uppercase text-[var(--color-text-secondary)]">{label}</p>
            <p className="text-xl font-bold text-[var(--color-text)] mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="stat-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-primary-light)] text-left">
                {["Employee", "Department", "Paid / Working", "LOP", "Gross", "Deductions", "Net Pay", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-[var(--color-text-secondary)] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-primary-border)]">
              {!data ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">Loading…</td></tr>
              ) : data.payslips.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                  No payslips for {formatMonth(month)}. Click “Run Payroll” to generate them.
                </td></tr>
              ) : (
                data.payslips.map((p) => (
                  <tr key={p._id} className="hover:bg-[var(--color-primary-light)]">
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.employee.name}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{p.employee.code}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{p.employee.department ?? "—"}</td>
                    <td className="px-4 py-3">{p.paidDays} / {p.workingDays}</td>
                    <td className="px-4 py-3">{p.lopDays || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatCurrency(p.grossEarnings)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-red-600">{formatCurrency(p.totalDeductions)}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold">{formatCurrency(p.netPay)}</td>
                    <td className="px-4 py-3"><Badge value={p.status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-3 text-xs font-semibold">
                        <a className="text-[var(--color-primary)] hover:underline" href={`/api/payroll/payslips/${p._id}/pdf`} target="_blank" rel="noreferrer">PDF</a>
                        {p.status === "draft" ? (
                          <>
                            <button className="text-green-700 hover:underline" onClick={() => act(p, "publish")}>Publish</button>
                            <button className="text-red-600 hover:underline" onClick={() => act(p, "delete")}>Delete</button>
                          </>
                        ) : (
                          <button className="text-[var(--color-text-secondary)] hover:underline" onClick={() => act(p, "unpublish")}>Unpublish</button>
                        )}
                      </div>
                    </td>
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

// ── Salary structures ─────────────────────────────────────────────────────────

interface SalaryRow {
  employee: {
    _id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    departmentId?: { name: string };
    designationId?: { name: string };
  };
  salary: (SalaryInput & { effectiveFrom: string }) | null;
  monthlyGross: number;
}

function SalaryTab() {
  const [rows, setRows] = useState<SalaryRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState<SalaryRow | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (missing) qs.set("missing", "true");
    try {
      setError("");
      setRows((await apiFetch<{ rows: SalaryRow[] }>(`/api/payroll/salary?${qs}`)).rows);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [search, missing]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" message={error} />}
      {success && <Alert variant="success" message={success} />}
      <div className="stat-card p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <input className="form-input sm:max-w-sm" placeholder="Search name or employee ID" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={missing} onChange={(e) => setMissing(e.target.checked)} />
          Only employees without a salary structure
        </label>
      </div>

      <div className="stat-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-primary-light)] text-left">
                {["Employee", "Department / Designation", "Basic", "Monthly Gross", "Annual CTC", ""].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-primary-border)]">
              {!rows ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">No employees found</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.employee._id} className="hover:bg-[var(--color-primary-light)]">
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.employee.firstName} {r.employee.lastName}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{r.employee.employeeId}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {r.employee.departmentId?.name ?? "—"} · {r.employee.designationId?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">{r.salary ? formatCurrency(r.salary.basic) : <Badge value="pending" label="Not set" />}</td>
                    <td className="px-4 py-3">{r.salary ? formatCurrency(r.monthlyGross) : "—"}</td>
                    <td className="px-4 py-3">{r.salary ? formatCurrency(r.monthlyGross * 12) : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setEditing(r)}>
                        {r.salary ? "Edit" : "Set salary"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <SalaryModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setSuccess(`Salary saved for ${editing.employee.firstName} ${editing.employee.lastName}.`);
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

const SALARY_FIELDS: { key: keyof SalaryInput; label: string; suffix?: string }[] = [
  { key: "basic", label: "Basic salary" },
  { key: "hra", label: "House rent allowance" },
  { key: "specialAllowance", label: "Special allowance" },
  { key: "otherAllowances", label: "Other allowances" },
  { key: "pfPercent", label: "Provident fund", suffix: "% of basic" },
  { key: "professionalTax", label: "Professional tax" },
  { key: "tdsPercent", label: "Income tax (TDS)", suffix: "% of gross" },
  { key: "otherDeductions", label: "Other deductions" },
];

function SalaryModal({ row, onClose, onSaved }: { row: SalaryRow; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Record<keyof SalaryInput, string>>(() => {
    const s = row.salary;
    return {
      basic: String(s?.basic ?? ""),
      hra: String(s?.hra ?? 0),
      specialAllowance: String(s?.specialAllowance ?? 0),
      otherAllowances: String(s?.otherAllowances ?? 0),
      pfPercent: String(s?.pfPercent ?? 12),
      professionalTax: String(s?.professionalTax ?? 200),
      tdsPercent: String(s?.tdsPercent ?? 0),
      otherDeductions: String(s?.otherDeductions ?? 0),
    };
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const numeric = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, Number(v) || 0])) as unknown as SalaryInput;
  const preview = calculatePayroll(numeric, { workingDays: 22, eligibleDays: 22, lopDays: 0 });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch(`/api/payroll/salary/${row.employee._id}`, { method: "PUT", json: numeric });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <Modal title={`Salary · ${row.employee.firstName} ${row.employee.lastName}`} onClose={onClose} size="lg">
      {error && <Alert variant="error" message={error} className="mb-4" />}
      <form onSubmit={save} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SALARY_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="form-label" htmlFor={f.key}>
                {f.label} {f.suffix && <span className="text-xs text-[var(--color-text-secondary)]">({f.suffix})</span>}
              </label>
              <input
                id={f.key}
                type="number"
                min={0}
                max={f.suffix ? 100 : undefined}
                step="any"
                className="form-input"
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                required={f.key === "basic"}
              />
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-[var(--color-primary-light)] p-4 grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-[var(--color-text-secondary)]">Monthly gross</p>
            <p className="font-bold">{formatCurrency(monthlyGross(numeric))}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-secondary)]">Deductions (full month)</p>
            <p className="font-bold text-red-600">{formatCurrency(preview.totalDeductions)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-secondary)]">Net pay (full month)</p>
            <p className="font-bold text-[var(--color-primary)]">{formatCurrency(preview.netPay)}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Saving…" : "Save salary"}</button>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
