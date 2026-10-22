"use client";

import { useCallback, useEffect, useState } from "react";
import Tabs from "@/components/ui/Tabs";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import { apiFetch, formatDateShort } from "@/lib/apiClient";
import {
  LEAVE_STATUS,
  LEAVE_TYPES,
  LEAVE_TYPE_LABELS,
  type LeaveBalanceRow,
  type LeaveType,
} from "@/lib/leavePolicy";
import { currentMonth } from "@/lib/utils/dates";

interface LeaveRow {
  _id: string;
  employeeId?: {
    _id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    departmentId?: { name: string };
  };
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  isHalfDay?: boolean;
  reason: string;
  status: string;
  reviewedBy?: { name: string };
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
}

interface ListResponse {
  leaves: LeaveRow[];
  pagination: { page: number; pages: number; total: number };
  noEmployeeRecord?: boolean;
}

type TabId = "mine" | "requests";

export default function LeaveManagement({
  canApprove,
  hasEmployeeRecord,
}: {
  canApprove: boolean;
  hasEmployeeRecord: boolean;
}) {
  const [tab, setTab] = useState<TabId>(hasEmployeeRecord ? "mine" : "requests");
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!canApprove) return;
    apiFetch<ListResponse>("/api/leaves?status=pending&limit=1")
      .then((d) => setPendingCount(d.pagination.total))
      .catch(() => {});
  }, [canApprove, tab]);

  const tabs: { id: TabId; label: string; count?: number }[] = [];
  if (hasEmployeeRecord) tabs.push({ id: "mine", label: "My Leave" });
  if (canApprove) tabs.push({ id: "requests", label: "Leave Requests", count: pendingCount });

  if (!tabs.length)
    return (
      <Alert
        variant="warning"
        message="Your account is not linked to an employee record, so you cannot apply for leave. Contact HR."
      />
    );

  return (
    <div>
      {tabs.length > 1 && <Tabs tabs={tabs} active={tab} onChange={setTab} />}
      {tab === "mine" ? <MyLeave /> : <LeaveRequests />}
    </div>
  );
}

// ── Employee view ─────────────────────────────────────────────────────────────

function MyLeave() {
  const year = new Date().getFullYear();
  const [balance, setBalance] = useState<LeaveBalanceRow[]>([]);
  const [data, setData] = useState<ListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showApply, setShowApply] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      const [b, l] = await Promise.all([
        apiFetch<{ balance: LeaveBalanceRow[] }>(`/api/leaves/balance?year=${year}`),
        apiFetch<ListResponse>(`/api/leaves?scope=mine&page=${page}&limit=10`),
      ]);
      setBalance(b.balance);
      setData(l);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [page, year]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function cancel(id: string) {
    if (!confirm("Cancel this leave request?")) return;
    try {
      await apiFetch(`/api/leaves/${id}`, { method: "PATCH", json: { action: "cancelled" } });
      setSuccess("Leave request cancelled.");
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {error && <Alert variant="error" message={error} />}
      {success && <Alert variant="success" message={success} />}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Leave Balance · {year}</h2>
        <button className="btn-primary w-auto" onClick={() => setShowApply(true)}>
          + Apply for Leave
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {balance.map((b) => (
          <div key={b.leaveType} className="stat-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
              {LEAVE_TYPE_LABELS[b.leaveType]}
            </p>
            <p className="text-2xl font-bold text-[var(--color-primary)] mt-1">
              {b.remaining === null ? "∞" : b.remaining}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              {b.entitled === null ? `${b.used} used` : `${b.used} used of ${b.entitled}`}
              {b.pending > 0 && ` · ${b.pending} pending`}
            </p>
          </div>
        ))}
      </div>

      <div className="stat-card p-0 overflow-hidden">
        <h2 className="px-5 py-4 border-b border-[var(--color-primary-border)] font-semibold text-[var(--color-text)]">
          Leave History
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-primary-light)] text-left">
                {["Type", "Dates", "Days", "Reason", "Status", "Reviewer note", ""].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-primary-border)]">
              {!data ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">Loading…</td></tr>
              ) : data.leaves.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">No leave requests yet</td></tr>
              ) : (
                data.leaves.map((l) => {
                  const cancellable =
                    l.status === "pending" ||
                    (l.status === "approved" && l.startDate.slice(0, 10) > today);
                  return (
                    <tr key={l._id}>
                      <td className="px-4 py-3 font-medium">{LEAVE_TYPE_LABELS[l.leaveType]}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)] whitespace-nowrap">
                        {formatDateShort(l.startDate)}
                        {l.endDate !== l.startDate && ` – ${formatDateShort(l.endDate)}`}
                      </td>
                      <td className="px-4 py-3">{l.totalDays}{l.isHalfDay && " (half)"}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)] max-w-xs truncate" title={l.reason}>{l.reason}</td>
                      <td className="px-4 py-3"><Badge value={l.status} /></td>
                      <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">
                        {l.reviewNotes ?? (l.reviewedBy ? `by ${l.reviewedBy.name}` : "—")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {cancellable && (
                          <button className="text-xs font-semibold text-red-600 hover:underline" onClick={() => cancel(l._id)}>
                            Cancel
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
        {data && <Pagination {...data.pagination} page={page} onChange={setPage} />}
      </div>

      {showApply && (
        <ApplyLeaveModal
          balance={balance}
          onClose={() => setShowApply(false)}
          onDone={() => {
            setShowApply(false);
            setSuccess("Leave request submitted. You'll be notified when it is reviewed.");
            load();
          }}
        />
      )}
    </div>
  );
}

function ApplyLeaveModal({
  balance,
  onClose,
  onDone,
}: {
  balance: LeaveBalanceRow[];
  onClose: () => void;
  onDone: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    leaveType: "annual" as LeaveType,
    startDate: today,
    endDate: today,
    isHalfDay: false,
    reason: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const row = balance.find((b) => b.leaveType === form.leaveType);
  const available = row && row.entitled !== null ? row.entitled - row.used - row.pending : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch("/api/leaves", {
        method: "POST",
        json: { ...form, endDate: form.isHalfDay ? form.startDate : form.endDate },
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Apply for Leave" onClose={onClose}>
      {error && <Alert variant="error" message={error} className="mb-4" />}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="form-label" htmlFor="leaveType">Leave type</label>
          <select
            id="leaveType"
            className="form-input"
            value={form.leaveType}
            onChange={(e) => setForm({ ...form, leaveType: e.target.value as LeaveType })}
          >
            {LEAVE_TYPES.map((t) => (
              <option key={t} value={t}>{LEAVE_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            {available === null ? "No balance limit (salary is deducted)" : `Available: ${Math.max(available, 0)} day(s)`}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isHalfDay}
            onChange={(e) => setForm({ ...form, isHalfDay: e.target.checked })}
          />
          Half day
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label" htmlFor="startDate">{form.isHalfDay ? "Date" : "From"}</label>
            <input
              id="startDate"
              type="date"
              className="form-input"
              value={form.startDate}
              onChange={(e) =>
                setForm({
                  ...form,
                  startDate: e.target.value,
                  endDate: form.endDate < e.target.value ? e.target.value : form.endDate,
                })
              }
              required
            />
          </div>
          {!form.isHalfDay && (
            <div>
              <label className="form-label" htmlFor="endDate">To</label>
              <input
                id="endDate"
                type="date"
                className="form-input"
                min={form.startDate}
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
              />
            </div>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-secondary)]">Weekends are not counted.</p>
        <div>
          <label className="form-label" htmlFor="reason">Reason</label>
          <textarea
            id="reason"
            className="form-input"
            rows={3}
            maxLength={500}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            required
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Submitting…" : "Submit request"}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

// ── Approver view ─────────────────────────────────────────────────────────────

function LeaveRequests() {
  const [filters, setFilters] = useState({ status: "pending", leaveType: "", month: "", search: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reviewing, setReviewing] = useState<{ leave: LeaveRow; action: "approved" | "rejected" } | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ page: String(page), limit: "15" });
    Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
    try {
      setError("");
      setData(await apiFetch<ListResponse>(`/api/leaves?${qs}`));
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
        <input
          className="form-input"
          placeholder="Search employee name or ID"
          value={filters.search}
          onChange={(e) => setFilter("search", e.target.value)}
        />
        <select className="form-input" value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
          <option value="">All statuses</option>
          {LEAVE_STATUS.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select className="form-input" value={filters.leaveType} onChange={(e) => setFilter("leaveType", e.target.value)}>
          <option value="">All types</option>
          {LEAVE_TYPES.map((t) => <option key={t} value={t}>{LEAVE_TYPE_LABELS[t]}</option>)}
        </select>
        <input
          type="month"
          className="form-input"
          value={filters.month}
          max={currentMonth().slice(0, 4) + "-12"}
          onChange={(e) => setFilter("month", e.target.value)}
        />
      </div>

      <div className="stat-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-primary-light)] text-left">
                {["Employee", "Type", "Dates", "Days", "Reason", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-primary-border)]">
              {!data ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">Loading…</td></tr>
              ) : data.leaves.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">No leave requests match these filters</td></tr>
              ) : (
                data.leaves.map((l) => (
                  <tr key={l._id} className="hover:bg-[var(--color-primary-light)]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--color-text)]">
                        {l.employeeId ? `${l.employeeId.firstName} ${l.employeeId.lastName}` : "—"}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {l.employeeId?.employeeId} · {l.employeeId?.departmentId?.name ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">{LEAVE_TYPE_LABELS[l.leaveType]}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--color-text-secondary)]">
                      {formatDateShort(l.startDate)}
                      {l.endDate !== l.startDate && ` – ${formatDateShort(l.endDate)}`}
                    </td>
                    <td className="px-4 py-3">{l.totalDays}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)] max-w-xs truncate" title={l.reason}>{l.reason}</td>
                    <td className="px-4 py-3">
                      <Badge value={l.status} />
                      {l.reviewedBy && <p className="text-xs text-[var(--color-text-secondary)] mt-1">by {l.reviewedBy.name}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {l.status === "pending" ? (
                        <div className="flex gap-2">
                          <button
                            className="px-3 py-1 rounded-md text-xs font-semibold bg-green-600 text-white hover:bg-green-700"
                            onClick={() => setReviewing({ leave: l, action: "approved" })}
                          >
                            Approve
                          </button>
                          <button
                            className="px-3 py-1 rounded-md text-xs font-semibold bg-red-600 text-white hover:bg-red-700"
                            onClick={() => setReviewing({ leave: l, action: "rejected" })}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--color-text-secondary)]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data && <Pagination {...data.pagination} page={page} onChange={setPage} />}
      </div>

      {reviewing && (
        <ReviewModal
          leave={reviewing.leave}
          action={reviewing.action}
          onClose={() => setReviewing(null)}
          onDone={(msg) => {
            setReviewing(null);
            setSuccess(msg);
            load();
          }}
        />
      )}
    </div>
  );
}

function ReviewModal({
  leave,
  action,
  onClose,
  onDone,
}: {
  leave: LeaveRow;
  action: "approved" | "rejected";
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const name = leave.employeeId ? `${leave.employeeId.firstName} ${leave.employeeId.lastName}` : "employee";

  async function submit() {
    if (action === "rejected" && notes.trim().length < 3) {
      setError("Please give a reason for rejecting.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch(`/api/leaves/${leave._id}`, { method: "PATCH", json: { action, notes } });
      onDone(`Leave for ${name} ${action}.`);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <Modal title={action === "approved" ? "Approve leave" : "Reject leave"} onClose={onClose}>
      {error && <Alert variant="error" message={error} className="mb-4" />}
      <p className="text-sm text-[var(--color-text-secondary)] mb-4">
        {name} · {LEAVE_TYPE_LABELS[leave.leaveType]} · {leave.totalDays} day(s) ·{" "}
        {formatDateShort(leave.startDate)} – {formatDateShort(leave.endDate)}
      </p>
      <p className="text-sm mb-4 bg-[var(--color-primary-light)] rounded-lg p-3">“{leave.reason}”</p>
      <label className="form-label" htmlFor="notes">
        Note to employee {action === "rejected" ? "(required)" : "(optional)"}
      </label>
      <textarea id="notes" className="form-input" rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex gap-3 pt-4">
        <button className="btn-primary" disabled={loading} onClick={submit}>
          {loading ? "Saving…" : action === "approved" ? "Approve" : "Reject"}
        </button>
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}
