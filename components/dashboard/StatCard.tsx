"use client";

import Link from "next/link";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: { value: number; label: string };
  href?: string;
  color?: "blue" | "green" | "red" | "yellow" | "purple";
}

const colorMap = {
  blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-100" },
  green: {
    bg: "bg-green-50",
    icon: "text-green-600",
    border: "border-green-100",
  },
  red: { bg: "bg-red-50", icon: "text-red-600", border: "border-red-100" },
  yellow: {
    bg: "bg-yellow-50",
    icon: "text-yellow-600",
    border: "border-yellow-100",
  },
  purple: {
    bg: "bg-purple-50",
    icon: "text-purple-600",
    border: "border-purple-100",
  },
};

export default function StatCard({
  title,
  value,
  icon,
  subtitle,
  trend,
  href,
  color = "blue",
}: StatCardProps) {
  const c = colorMap[color];

  const content = (
    <div className="stat-card flex flex-col gap-3 group hover:border-[var(--color-primary)] transition-colors cursor-default">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${c.bg} ${c.border} border`}>
          <span className={`block ${c.icon}`}>{icon}</span>
        </div>
        {trend && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trend.value >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
          >
            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-[var(--color-text)]">{value}</p>
        <p className="text-sm font-medium text-[var(--color-text-secondary)] mt-0.5">
          {title}
        </p>
        {subtitle && (
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );

  if (href)
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  return content;
}
