"use client";

interface Tab<T extends string> {
  id: T;
  label: string;
  count?: number;
}

export default function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      role="tablist"
      className="flex gap-1 border-b border-[var(--color-primary-border)] mb-6 overflow-x-auto"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
            active === t.id
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
          }`}
        >
          {t.label}
          {t.count !== undefined && t.count > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[var(--color-primary)] text-white text-xs">
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
