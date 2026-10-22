"use client";

/**
 * Lightweight single-series charts (no chart library).
 * One hue (brand primary), thin rounded bars, hover tooltip on every mark.
 */

export interface Datum {
  label: string;
  value: number;
  /** Tooltip text; defaults to "label: value" */
  hint?: string;
}

/** Horizontal bars — for ranked categories (departments, types…). */
export function BarList({
  data,
  format = (v) => String(v),
  emptyText = "No data",
}: {
  data: Datum[];
  format?: (v: number) => string;
  emptyText?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 0);
  if (!data.length || max === 0)
    return <p className="text-sm text-[var(--color-text-secondary)] py-6 text-center">{emptyText}</p>;

  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label} className="group" title={d.hint ?? `${d.label}: ${format(d.value)}`}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-[var(--color-text)] truncate pr-2">{d.label}</span>
            <span className="font-semibold text-[var(--color-text)] tabular-nums">{format(d.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--color-primary-light)]">
            <div
              className="h-2 rounded-full bg-[var(--color-primary)] group-hover:bg-[var(--color-primary-hover)] transition-colors"
              style={{ width: `${Math.max((d.value / max) * 100, 1.5)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Vertical columns — for change over time (days, months). */
export function ColumnChart({
  data,
  format = (v) => String(v),
  height = 160,
  emptyText = "No data",
}: {
  data: Datum[];
  format?: (v: number) => string;
  height?: number;
  emptyText?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 0);
  if (!data.length || max === 0)
    return <p className="text-sm text-[var(--color-text-secondary)] py-6 text-center">{emptyText}</p>;

  const labelEvery = Math.ceil(data.length / 12);

  return (
    <div>
      <div className="flex items-end gap-[2px] border-b border-[var(--color-primary-border)]" style={{ height }}>
        {data.map((d) => (
          <div key={d.label} className="group relative flex-1 h-full flex items-end justify-center">
            <div
              className="w-full max-w-[28px] rounded-t bg-[var(--color-primary)] group-hover:bg-[var(--color-primary-hover)] transition-colors"
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 2 : 0 }}
            />
            <div className="pointer-events-none absolute bottom-full mb-1 hidden group-hover:block z-10 whitespace-nowrap rounded-md bg-[var(--color-text)] px-2 py-1 text-xs text-white shadow">
              {d.hint ?? `${d.label}: ${format(d.value)}`}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-[2px] mt-1">
        {data.map((d, i) => (
          <span key={d.label} className="flex-1 text-center text-[10px] text-[var(--color-text-secondary)] truncate">
            {i % labelEvery === 0 ? d.label : ""}
          </span>
        ))}
      </div>
      <p className="text-xs text-[var(--color-text-secondary)] mt-1">Peak: {format(max)}</p>
    </div>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{label}</p>
      <p className="text-2xl font-bold text-[var(--color-text)] mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{sub}</p>}
    </div>
  );
}
