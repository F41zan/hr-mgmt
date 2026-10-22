"use client";

import Link from "next/link";

interface Action {
  label: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

export default function QuickActions({ actions }: { actions: Action[] }) {
  return (
    <div className="stat-card">
      <h3 className="font-semibold text-[var(--color-text)] mb-4">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className={`flex flex-col gap-2 p-3 rounded-xl border transition-all hover:shadow-sm hover:-translate-y-0.5 ${a.color}`}
          >
            <span className="text-2xl">{a.icon}</span>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">
                {a.label}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                {a.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
