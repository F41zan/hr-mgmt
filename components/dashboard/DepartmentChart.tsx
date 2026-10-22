"use client";

interface DeptData {
  department: string;
  count: number;
}

const COLORS = [
  "#2563EB",
  "#7C3AED",
  "#16A34A",
  "#D97706",
  "#DC2626",
  "#0891B2",
  "#DB2777",
  "#65A30D",
  "#EA580C",
  "#6366F1",
];

export default function DepartmentChart({ data }: { data: DeptData[] }) {
  if (!data.length) {
    return (
      <div className="stat-card">
        <h3 className="font-semibold text-[var(--color-text)] mb-4">
          Department Distribution
        </h3>
        <div className="flex items-center justify-center h-40 text-[var(--color-text-secondary)] text-sm">
          No department data available
        </div>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.count, 0);
  const maxVal = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="stat-card">
      <h3 className="font-semibold text-[var(--color-text)] mb-4">
        Department Distribution
      </h3>
      <div className="space-y-3">
        {data.map((d, i) => {
          const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
          const barPct = (d.count / maxVal) * 100;
          return (
            <div key={d.department}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-[var(--color-text)] truncate max-w-[60%]">
                  {d.department}
                </span>
                <span className="text-[var(--color-text-secondary)]">
                  {d.count} ({pct}%)
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barPct}%`,
                    background: COLORS[i % COLORS.length],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-[var(--color-primary-border)]">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Total active employees:{" "}
          <span className="font-semibold text-[var(--color-text)]">
            {total}
          </span>
        </p>
      </div>
    </div>
  );
}
