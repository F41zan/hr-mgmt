"use client";

import { useState, useEffect } from "react";
import {
  formatTime,
  formatDate,
  formatWorkingDuration,
  getCanonicalAttendanceDate,
} from "@/lib/utils/attendance";

interface AttendanceRecord {
  _id: string;
  attendanceDate: string;
  checkInAt?: string;
  checkOutAt?: string;
  workingDurationMinutes?: number;
  status: string;
  isLate: boolean;
  lateMinutes: number;
  isEarlyDeparture: boolean;
  earlyDepartureMinutes: number;
}

interface TodayAttendance extends AttendanceRecord {}

export default function MyAttendance() {
  const [todayAttendance, setTodayAttendance] =
    useState<TodayAttendance | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/attendance/me?limit=30");

      if (!response.ok) {
        throw new Error("Failed to fetch attendance");
      }

      const data = await response.json();
      setTodayAttendance(data.todayAttendance);
      setAttendance(data.attendance);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load attendance",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch("/api/attendance/check-in", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to check in");
      }

      alert("Checked in successfully!");
      fetchAttendance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check in");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch("/api/attendance/check-out", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to check out");
      }

      alert("Checked out successfully!");
      fetchAttendance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check out");
    } finally {
      setActionLoading(false);
    }
  };

  const canCheckIn = !todayAttendance?.checkInAt;
  const canCheckOut =
    todayAttendance?.checkInAt && !todayAttendance?.checkOutAt;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800";
      case "absent":
        return "bg-red-100 text-red-800";
      case "half-day":
        return "bg-yellow-100 text-yellow-800";
      case "on-leave":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="stat-card animate-pulse">
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
        <div className="stat-card animate-pulse">
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Today's Attendance Card */}
      <div className="stat-card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Current Time & Date */}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
              Today's Attendance
            </h2>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-[var(--color-primary)]">
                {currentTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })}
              </div>
              <div className="text-sm text-[var(--color-text-secondary)]">
                {currentTime.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>

            {/* Attendance Status */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Check In
                </p>
                <p className="text-lg font-semibold text-[var(--color-text)]">
                  {todayAttendance?.checkInAt
                    ? formatTime(new Date(todayAttendance.checkInAt))
                    : "--:--"}
                </p>
                {todayAttendance?.isLate && (
                  <span className="text-xs text-red-600">
                    Late by {todayAttendance.lateMinutes} min
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Check Out
                </p>
                <p className="text-lg font-semibold text-[var(--color-text)]">
                  {todayAttendance?.checkOutAt
                    ? formatTime(new Date(todayAttendance.checkOutAt))
                    : "--:--"}
                </p>
                {todayAttendance?.checkOutAt &&
                  todayAttendance?.workingDurationMinutes && (
                    <span className="text-xs text-green-600">
                      {formatWorkingDuration(
                        todayAttendance.workingDurationMinutes,
                      )}
                    </span>
                  )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 md:min-w-[200px]">
            <button
              onClick={handleCheckIn}
              disabled={!canCheckIn || actionLoading}
              className="btn-primary"
            >
              {actionLoading ? (
                <span className="flex items-center gap-2">
                  <span className="spinner"></span>
                  Processing...
                </span>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                  Check In
                </>
              )}
            </button>

            <button
              onClick={handleCheckOut}
              disabled={!canCheckOut || actionLoading}
              className="btn-secondary"
            >
              {actionLoading ? (
                <span className="flex items-center gap-2">
                  <span className="spinner"></span>
                  Processing...
                </span>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Check Out
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 alert alert-error">
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Attendance History */}
      <div className="stat-card">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
          Recent Attendance History
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-primary-light)] text-left">
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">
                  Date
                </th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">
                  Check In
                </th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">
                  Check Out
                </th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">
                  Working Hours
                </th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">
                  Status
                </th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-primary-border)]">
              {attendance.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-[var(--color-text-secondary)]"
                  >
                    No attendance records found
                  </td>
                </tr>
              ) : (
                attendance.map((record) => (
                  <tr
                    key={record._id}
                    className="hover:bg-[var(--color-primary-light)] transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--color-text)]">
                      {formatDate(record.attendanceDate)}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {record.checkInAt
                        ? formatTime(new Date(record.checkInAt))
                        : "--:--"}
                      {record.isLate && (
                        <span className="ml-2 text-xs text-red-600">
                          (Late)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {record.checkOutAt
                        ? formatTime(new Date(record.checkOutAt))
                        : "--:--"}
                      {record.isEarlyDeparture && (
                        <span className="ml-2 text-xs text-orange-600">
                          (Early)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {record.workingDurationMinutes
                        ? formatWorkingDuration(record.workingDurationMinutes)
                        : "--"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(record.status)}`}
                      >
                        {record.status.replace("-", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">
                      {record.isLate && `Late by ${record.lateMinutes}m`}
                      {record.isEarlyDeparture &&
                        ` Early ${record.earlyDepartureMinutes}m`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
