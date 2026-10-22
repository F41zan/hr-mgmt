"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/apiClient";

export interface NotificationItem {
  _id: string;
  type: "leave" | "interview" | "payslip" | "system";
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export const TYPE_ICON: Record<NotificationItem["type"], string> = {
  leave: "🌴",
  interview: "🗓️",
  payslip: "💰",
  system: "🔔",
};

const POLL_MS = 60_000;

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=8");
      if (!res.ok) return;
      const data = (await res.json()) as { notifications: NotificationItem[]; unreadCount: number };
      setItems(data.notifications);
      setUnread(data.unreadCount);
    } catch {
      /* offline — try again next poll */
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(() => document.visibilityState === "visible" && load(), POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function markAll() {
    await fetch("/api/notifications", { method: "PATCH" });
    load();
  }

  async function openItem(n: NotificationItem) {
    if (!n.isRead) await fetch(`/api/notifications/${n._id}`, { method: "PATCH" });
    setOpen(false);
    load();
    if (n.link) router.push(n.link);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] bg-white rounded-xl shadow-xl border border-[var(--color-primary-border)] z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-primary-border)]">
            <p className="font-semibold text-sm">Notifications</p>
            {unread > 0 && (
              <button className="text-xs font-semibold text-[var(--color-primary)] hover:underline" onClick={markAll}>
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto divide-y divide-[var(--color-primary-border)]">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">You&apos;re all caught up</li>
            ) : (
              items.map((n) => (
                <li key={n._id}>
                  <button
                    onClick={() => openItem(n)}
                    className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-[var(--color-primary-light)] ${n.isRead ? "" : "bg-blue-50/60"}`}
                  >
                    <span className="text-lg leading-none mt-0.5" aria-hidden="true">{TYPE_ICON[n.type]}</span>
                    <span className="flex-1 min-w-0">
                      <span className={`block text-sm ${n.isRead ? "" : "font-semibold"}`}>{n.title}</span>
                      <span className="block text-xs text-[var(--color-text-secondary)] line-clamp-2">{n.message}</span>
                      <span className="block text-[10px] text-[var(--color-text-secondary)] mt-1">{formatDateTime(n.createdAt)}</span>
                    </span>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] mt-1.5" aria-label="Unread" />}
                  </button>
                </li>
              ))
            )}
          </ul>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block text-center text-sm font-semibold text-[var(--color-primary)] py-2.5 border-t border-[var(--color-primary-border)] hover:bg-[var(--color-primary-light)]"
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
