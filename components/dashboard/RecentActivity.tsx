"use client";

interface ActivityItem {
  id: string;
  description: string;
  timestamp: string;
  type: string;
}

const typeIcon: Record<string, string> = {
  pending: "🕐",
  approved: "✅",
  rejected: "❌",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function RecentActivity({ items }: { items: ActivityItem[] }) {
  if (!items.length) {
    return (
      <div className="stat-card">
        <h3 className="font-semibold text-[var(--color-text)] mb-4">
          Recent Activity
        </h3>
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <span className="text-3xl">📋</span>
          <p className="text-[var(--color-text-secondary)] text-sm">
            No recent activity
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card">
      <h3 className="font-semibold text-[var(--color-text)] mb-4">
        Recent Activity
      </h3>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3 items-start">
            <span className="text-lg flex-shrink-0 mt-0.5">
              {typeIcon[item.type] ?? "📌"}
            </span>
            <div className="min-w-0">
              <p className="text-sm text-[var(--color-text)] leading-snug">
                {item.description}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                {timeAgo(item.timestamp)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
