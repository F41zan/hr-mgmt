"use client";

import { useState, useEffect } from "react";
import {
  formatTime,
  formatWorkingDuration,
  getDaysInMonth,
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
}

interface CalendarData {
  year: number;
  month: number;
  daysInMonth: number;
  employee: {
    employeeId: string;
    firstName: string;
    lastName: string;
    departmentId?: {
      name: string;
    };
  };
  attendance: AttendanceRecord[];
  summary: {
    present: number;
    absent: number;
    halfDay: number;
    onLeave: number;
    lateArrivals: number;
    earlyDepartures: number;
    totalWorkingHours: number;
  };
}

interface AttendanceCalendarProps {
  employeeId: string;
  onClose: () => void;
}

export default function AttendanceCalendar({
  employeeId,
  onClose,
}: AttendanceCalendarProps) {
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState<AttendanceRecord | null>(
    null,
  );

  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);

  useEffect(() => {
    fetchCalendar();
  }, [employeeId, year, month]);

  const fetchCalendar = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/attendance/calendar?employeeId=${employeeId}&year=${year}&month=${month}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch calendar");
      }

      const data = await response.json();
      setCalendarData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-500";
      case "absent":
        return "bg-red-500";
      case "half-day":
        return "bg-yellow-500";
      case "on-leave":
        return "bg-blue-500";
      default:
        return "bg-gray-300";
    }
  };

  const getAttendanceForDay = (day: number) => {
    if (!calendarData) return null;
    return calendarData.attendance.find((att) => {
      const attDate = new Date(att.attendanceDate);
      return attDate.getDate() === day;
    });
  };

  const getFirstDayOfMonth = () => {
    const date = new Date(year, month - 1, 1);
    return date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  };

  const renderCalendarDays = () => {
    if (!calendarData) return null;

    const firstDay = getFirstDayOfMonth();
    const daysInMonth = calendarData.daysInMonth;
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className="aspect-square p-2 border border-gray-200 bg-gray-50"
        ></div>,
      );
    }

    // Actual days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const attendance = getAttendanceForDay(day);
      const isToday =
        day === currentDate.getDate() &&
        month === currentDate.getMonth() + 1 &&
        year === currentDate.getFullYear();

      days.push(
        <div
          key={day}
          onClick={() => attendance && setSelectedDate(attendance)}
          className={`aspect-square p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
            isToday ? "bg-blue-50 border-blue-300" : ""
          }`}
        >
          <div className="flex flex-col h-full">
            <span
              className={`text-sm font-semibold ${isToday ? "text-blue-600" : "text-gray-700"}`}
            >
              {day}
            </span>
            {attendance && (
              <div className="mt-1 flex-1 flex flex-col justify-center items-center gap-1">
                <div
                  className={`w-3 h-3 rounded-full ${getStatusColor(attendance.status)}`}
                ></div>
                {attendance.isLate && (
                  <span className="text-xs text-red-600 font-medium">L</span>
                )}
              </div>
            )}
          </div>
        </div>,
      );
    }

    return days;
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full my-8">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">
            Monthly Attendance Calendar
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="spinner w-12 h-12"></div>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-red-600 mb-4">{error}</p>
              <button onClick={fetchCalendar} className="btn-primary">
                Retry
              </button>
            </div>
          ) : calendarData ? (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-[var(--color-text)]">
                  {calendarData.employee.firstName}{" "}
                  {calendarData.employee.lastName}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {calendarData.employee.employeeId}
                  {calendarData.employee.departmentId &&
                    ` • ${calendarData.employee.departmentId.name}`}
                </p>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePreviousMonth}
                  className="btn-secondary px-4 py-2"
                >
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
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>

                <h3 className="text-xl font-bold text-[var(--color-text)]">
                  {monthNames[month - 1]} {year}
                </h3>

                <button
                  onClick={handleNextMonth}
                  className="btn-secondary px-4 py-2"
                >
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
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600">Present</p>
                  <p className="text-2xl font-bold text-green-600">
                    {calendarData.summary.present}
                  </p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600">Absent</p>
                  <p className="text-2xl font-bold text-red-600">
                    {calendarData.summary.absent}
                  </p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600">Half Day</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {calendarData.summary.halfDay}
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600">On Leave</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {calendarData.summary.onLeave}
                  </p>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600">Late Arrivals</p>
                  <p className="text-xl font-bold text-orange-600">
                    {calendarData.summary.lateArrivals}
                  </p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600">Total Working Hours</p>
                  <p className="text-xl font-bold text-purple-600">
                    {calendarData.summary.totalWorkingHours}h
                  </p>
                </div>
              </div>

              {/* Calendar Grid */}
              <div>
                <div className="grid grid-cols-7 gap-0 mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        key={day}
                        className="text-center text-sm font-semibold text-gray-600 py-2"
                      >
                        {day}
                      </div>
                    ),
                  )}
                </div>
                <div className="grid grid-cols-7 gap-0 border border-gray-200">
                  {renderCalendarDays()}
                </div>
              </div>

              {/* Legend */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Legend
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span>Present</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                    <span>Absent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                    <span>Half Day</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    <span>On Leave</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 font-bold">L</span>
                    <span>Late Arrival</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 border-blue-400"></div>
                    <span>Today</span>
                  </div>
                </div>
              </div>

              {/* Selected Date Details */}
              {selectedDate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-[var(--color-text)] mb-3">
                    Selected Date Details
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Date</p>
                      <p className="font-medium">
                        {new Date(
                          selectedDate.attendanceDate,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Check In</p>
                      <p className="font-medium">
                        {selectedDate.checkInAt
                          ? formatTime(new Date(selectedDate.checkInAt))
                          : "--:--"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Check Out</p>
                      <p className="font-medium">
                        {selectedDate.checkOutAt
                          ? formatTime(new Date(selectedDate.checkOutAt))
                          : "--:--"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Working Hours</p>
                      <p className="font-medium">
                        {selectedDate.workingDurationMinutes
                          ? formatWorkingDuration(
                              selectedDate.workingDurationMinutes,
                            )
                          : "--"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Status</p>
                      <p className="font-medium capitalize">
                        {selectedDate.status.replace("-", " ")}
                      </p>
                    </div>
                    {selectedDate.isLate && (
                      <div>
                        <p className="text-gray-600">Late By</p>
                        <p className="font-medium text-red-600">
                          {selectedDate.lateMinutes} minutes
                        </p>
                      </div>
                    )}
                    {selectedDate.isEarlyDeparture && (
                      <div>
                        <p className="text-gray-600">Early Departure</p>
                        <p className="font-medium text-orange-600">Yes</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="btn-secondary w-full md:w-auto px-8"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
