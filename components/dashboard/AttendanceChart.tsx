"use client";

import { useState } from "react";

interface TrendDay {
  date: string;
  present: number;
  absent: number;
  late: number;
  on_leave: number;
}

interface Props {
  data: TrendDay[];
  onRangeChange?: (days: number) => void;
  loading?: boolean;
}

const COLORS = {
  present: "#2563EB",
  late: "#D97706",
  absent: "#DC2626",
  on_leave: "#7C3AED",
};

export default function AttendanceChart({
  data,
  onRangeChange,
  loading,
}: Props) {
  const [range, setRange] = useState(7);

  const handleRange = (d: number) => {
    setRange(d);
    onRangeChange?.(d);
  };

  const maxVal = Math.max(
    ...data.map((d) => d.present + d.late + d.absent + d.on_leave),
    1,
  );
  const chartH = 200;
  const chartW = 100; // percent-based via viewBox
  const barW = data.length > 0 ? (chartW / data.length) * 0.6 : 10;
  const gap = data.length > 0 ? chartW / data.length : 10;

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en", { month: "short", day: "numeric" });
  };

  return (
    <div className="stat-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--color-text)]">
          Attendance Trend
        </h3>
        <div className="flex gap-1">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => handleRange(d)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                range === d
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)]"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-[200px] flex items-center justify-center">
          <span className="spinner" />
        </div>
      ) : data.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-[var(--color-text-secondary)] text-sm">
          No attendance data available
        </div>
      ) : (
        <>
          {/* SVG bar chart */}
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartW} ${chartH + 24}`}
              className="w-full"
              style={{ minWidth: `${data.length * 32}px` }}
              aria-label="Attendance trend chart"
            >
              {/* Grid lines */}
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <line
                  key={f}
                  x1="0"
                  y1={chartH * (1 - f)}
                  x2={chartW}
                  y2={chartH * (1 - f)}
                  stroke="#E2E8F0"
                  strokeWidth="0.3"
                />
              ))}

              {/* Stacked bars */}
              {data.map((d, i) => {
                const x = i * gap + (gap - barW) / 2;
                const series: { key: keyof typeof COLORS; val: number }[] = [
                  { key: "present", val: d.present },
                  { key: "late", val: d.late },
                  { key: "absent", val: d.absent },
                  { key: "on_leave", val: d.on_leave },
                ];
                let yOff = 0;
                return (
                  <g key={d.date}>
                    {series.map(({ key, val }) => {
                      if (val === 0) return null;
                      const h = (val / maxVal) * chartH;
                      const y = chartH - yOff - h;
                      yOff += h;
                      return (
                        <rect
                          key={key}
                          x={x}
                          y={y}
                          width={barW}
                          height={h}
                          fill={COLORS[key]}
                          opacity={0.85}
                          rx="0.5"
                        >
                          <title>{`${key}: ${val}`}</title>
                        </rect>
                      );
                    })}
                    {/* X label */}
                    <text
                      x={x + barW / 2}
                      y={chartH + 14}
                      textAnchor="middle"
                      fontSize="4"
                      fill="#64748B"
                    >
                      {fmt(d.date)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-3">
            {(Object.entries(COLORS) as [keyof typeof COLORS, string][]).map(
              ([k, c]) => (
                <span
                  key={k}
                  className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]"
                >
                  <span
                    className="w-3 h-3 rounded-sm inline-block"
                    style={{ background: c }}
                  />
                  {k === "on_leave"
                    ? "On Leave"
                    : k.charAt(0).toUpperCase() + k.slice(1)}
                </span>
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
}
