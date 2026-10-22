"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Alert from "@/components/ui/Alert";
import Pagination from "@/components/ui/Pagination";
import { apiFetch, formatDateTime } from "@/lib/apiClient";
import { TYPE_ICON, type NotificationItem } from "./NotificationBell";

const FILTERS = [
  { id: "", label: "All" },
  { id: "leave", label: "Leave" },
  { id: "interview", label: "Interviews" },
  { id: "payslip", label: "Payslips" },
];

export default function NotificationList() {
  const [type, setType] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    notifications: NotificationItem[];
    unreadCount: number;
    pagination: { page: number; pages: number; total: number };
  } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ page: String(page), limit: "20" });
    if (type) qs.set("type", type);
    if (unreadOnly) qs.set("unread", "true");
    try {
      setData(await apiFetch(`/api/notifications?${qs}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [type, unreadOnly, page]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function mark(n: NotificationItem, isRead: boolean) {
    await apiFetch(`/api/notifications/${n._id}`, { method: "PATCH", json: { isRead } }).catch(() => {});
    load();
  }
  async function remove(n: NotificationItem) {
    await apiFetch(`/api/notifications/${n._id}`, { method: "DELETE" }).catch(() => {});
    load();
  }
  async function markAll() {
    await apiFetch("/api/notifications", { method: "PATCH" }).catch(() => {});
    load();
  }

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" message={error} />}
      <div className="stat-card p-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => { setType(f.id); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${type === f.id ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-primary-light)] text-[var(--color-primary)]"}`}
          >
            {f.label}
          </button>
        ))}
        <label className="flex items-center gap-2 text-sm ml-2">
          <input type="checkbox" checked={unreadOnly} onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }} />
          Unread only
        </label>
        {!!data?.unreadCount && (
          <button className="ml-auto btn-secondary px-3 py-1.5 text-xs" onClick={markAll}>
            Mark all read ({data.unreadCount})
          </button>
        )}
      </div>

      <div className="stat-card p-0 overflow-hidden">
        <ul className="divide-y divide-[var(--color-primary-border)]">
          {!data ? (
            <li className="px-5 py-8 text-center text-[var(--color-text-secondary)]">Loading…</li>
          ) : data.notifications.length === 0 ? (
            <li className="px-5 py-10 text-center text-[var(--color-text-secondary)]">No notifications</li>
          ) : (
            data.notifications.map((n) => (
              <li key={n._id} className={`px-5 py-4 flex gap-4 ${n.isRead ? "" : "bg-blue-50/60"}`}>
                <span className="text-xl" aria-hidden="true">{TYPE_ICON[n.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.isRead ? "" : "font-semibold"}`}>{n.title}</p>
                  <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-line mt-0.5">{n.message}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs">
                    <span className="text-[var(--color-text-secondary)]">{formatDateTime(n.createdAt)}</span>
                    {n.link && (
                      <Link href={n.link} onClick={() => !n.isRead && mark(n, true)} className="font-semibold text-[var(--color-primary)] hover:underline">
                        Open
                      </Link>
                    )}
                    <button className="font-semibold text-[var(--color-text-secondary)] hover:underline" onClick={() => mark(n, !n.isRead)}>
                      Mark {n.isRead ? "unread" : "read"}
                    </button>
                    <button className="font-semibold text-red-600 hover:underline" onClick={() => remove(n)}>
                      Dismiss
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
        {data && <Pagination {...data.pagination} page={page} onChange={setPage} />}
      </div>
    </div>
  );
}
