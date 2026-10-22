"use client";

interface Event {
  name: string;
  type: string;
  date: string;
  daysAway: number;
}

export default function UpcomingEvents({ events }: { events: Event[] }) {
  if (!events.length) {
    return (
      <div className="stat-card">
        <h3 className="font-semibold text-[var(--color-text)] mb-4">
          Upcoming Events
        </h3>
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <span className="text-3xl">🎉</span>
          <p className="text-[var(--color-text-secondary)] text-sm">
            No upcoming events in the next 30 days
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card">
      <h3 className="font-semibold text-[var(--color-text)] mb-4">
        Upcoming Events
      </h3>
      <ul className="space-y-3">
        {events.map((ev, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="text-xl">
              {ev.type.includes("birthday") ? "🎂" : "🎊"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text)] truncate">
                {ev.name}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] capitalize">
                {ev.type}
              </p>
            </div>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                ev.daysAway === 0
                  ? "bg-blue-100 text-blue-700"
                  : ev.daysAway <= 3
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-600"
              }`}
            >
              {ev.daysAway === 0 ? "Today" : `In ${ev.daysAway}d`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
