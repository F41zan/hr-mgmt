"use client";

import { useState, useEffect } from "react";
import {
  formatTime,
  formatDate,
  formatWorkingDuration,
} from "@/lib/utils/attendance";
import AttendanceCalendar from "./AttendanceCalendar";
import CorrectionModal from "./CorrectionModal";

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
  isManuallyCorrected: boolean;
  employeeId: {
    _id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    departmentId?: {
      name: string;
      code: string;
    };
  };
}

interface Department {
  _id: string;
  name: string;
  code: string;
}

interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
}

export default function AttendanceManagement() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showLateOnly, setShowLateOnly] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Summary stats
  const [summary, setSummary] = useState({
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    halfDayToday: 0,
    onLeaveToday: 0,
    missingCheckouts: 0,
  });

  // Modal states
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(
    null,
  );
  const [calendarEmployeeId, setCalendarEmployeeId] = useState("");

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [
    page,
    search,
    selectedDepartment,
    selectedEmployee,
    selectedStatus,
    startDate,
    endDate,
    showLateOnly,
  ]);

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/departments?status=active&limit=100");
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      }
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees?status=active&limit=1000");
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch("/api/attendance/summary");
      if (response.ok) {
        const data = await response.json();
        if (data.today) {
          setSummary({
            presentToday: data.today.present || 0,
            absentToday: data.today.absent || 0,
            lateToday: data.today.lateArrivals || 0,
            halfDayToday: data.today.halfDay || 0,
            onLeaveToday: data.today.onLeave || 0,
            missingCheckouts: data.today.missingCheckouts || 0,
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (search) params.append("search", search);
      if (selectedDepartment) params.append("departmentId", selectedDepartment);
      if (selectedEmployee) params.append("employeeId", selectedEmployee);
      if (selectedStatus) params.append("status", selectedStatus);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (showLateOnly) params.append("isLate", "true");

      const response = await fetch(`/api/attendance?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch attendance");
      }

      const data = await response.json();
      setAttendance(data.attendance || []);
      setTotal(data.pagination.total || 0);
      setTotalPages(data.pagination.pages || 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load attendance",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedDepartment("");
    setSelectedEmployee("");
    setSelectedStatus("");
    setStartDate("");
    setEndDate("");
    setShowLateOnly(false);
    setPage(1);
  };

  const handleViewCalendar = (employeeId: string) => {
    setCalendarEmployeeId(employeeId);
    setShowCalendar(true);
  };

  const handleCorrect = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setShowCorrection(true);
  };

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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Present Today
              </p>
              <p className="text-2xl font-bold text-green-600">
                {summary.presentToday}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Absent Today
              </p>
              <p className="text-2xl font-bold text-red-600">
                {summary.absentToday}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Late Arrivals
              </p>
              <p className="text-2xl font-bold text-orange-600">
                {summary.lateToday}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Half Day
              </p>
              <p className="text-2xl font-bold text-yellow-600">
                {summary.halfDayToday}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                On Leave
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {summary.onLeaveToday}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Missing Checkout
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {summary.missingCheckouts}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="stat-card">
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">
          Filters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="form-label">Search Employee</label>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Name, ID, or email"
              className="form-input"
            />
          </div>

          {/* Department Filter */}
          <div>
            <label className="form-label">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setPage(1);
              }}
              className="form-input"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div>
            <label className="form-label">Employee</label>
            <select
              value={selectedEmployee}
              onChange={(e) => {
                setSelectedEmployee(e.target.value);
                setPage(1);
              }}
              className="form-input"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="form-label">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="form-input"
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="half-day">Half Day</option>
              <option value="on-leave">On Leave</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="form-label">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="form-input"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="form-label">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="form-input"
            />
          </div>

          {/* Late Only */}
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showLateOnly}
                onChange={(e) => {
                  setShowLateOnly(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4"
              />
              <span className="text-sm text-[var(--color-text)]">
                Late Arrivals Only
              </span>
            </label>
          </div>

          {/* Reset Button */}
          <div className="flex items-end">
            <button
              onClick={handleResetFilters}
              className="btn-secondary w-full"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="stat-card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-primary-border)] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[var(--color-text)]">
              Attendance Records
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Showing {attendance.length} of {total} records
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-8">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600">{error}</p>
            <button onClick={fetchAttendance} className="mt-4 btn-primary">
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--color-primary-light)] text-left">
                    <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">
                      Employee
                    </th>
                    <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">
                      Department
                    </th>
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
                      Hours
                    </th>
                    <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">
                      Status
                    </th>
                    <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-primary-border)]">
                  {attendance.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-[var(--color-text-secondary)]"
                      >
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400 mb-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                        <p className="text-lg font-medium">
                          No attendance records found
                        </p>
                        <p className="text-sm mt-1">
                          Try adjusting your filters
                        </p>
                      </td>
                    </tr>
                  ) : (
                    attendance.map((record) => (
                      <tr
                        key={record._id}
                        className="hover:bg-[var(--color-primary-light)] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-[var(--color-text)]">
                              {record.employeeId.firstName}{" "}
                              {record.employeeId.lastName}
                            </p>
                            <p className="text-xs text-[var(--color-text-secondary)]">
                              {record.employeeId.employeeId}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                          {record.employeeId.departmentId?.name || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                          {formatDate(record.attendanceDate)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[var(--color-text)]">
                            {record.checkInAt
                              ? formatTime(new Date(record.checkInAt))
                              : "--:--"}
                          </span>
                          {record.isLate && (
                            <span className="block text-xs text-red-600">
                              Late {record.lateMinutes}m
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[var(--color-text)]">
                            {record.checkOutAt
                              ? formatTime(new Date(record.checkOutAt))
                              : "--:--"}
                          </span>
                          {record.isEarlyDeparture && (
                            <span className="block text-xs text-orange-600">
                              Early {record.earlyDepartureMinutes}m
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[var(--color-text)]">
                          {record.workingDurationMinutes
                            ? formatWorkingDuration(
                                record.workingDurationMinutes,
                              )
                            : "--"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(record.status)}`}
                          >
                            {record.status.replace("-", " ")}
                          </span>
                          {record.isManuallyCorrected && (
                            <span className="block text-xs text-purple-600 mt-1">
                              Corrected
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleViewCalendar(record.employeeId._id)
                              }
                              className="text-blue-600 hover:text-blue-800"
                              title="View Calendar"
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
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleCorrect(record)}
                              className="text-orange-600 hover:text-orange-800"
                              title="Correct Attendance"
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
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-[var(--color-primary-border)] flex items-center justify-between">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary px-3 py-1 text-sm"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-primary px-3 py-1 text-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showCalendar && (
        <AttendanceCalendar
          employeeId={calendarEmployeeId}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {showCorrection && selectedRecord && (
        <CorrectionModal
          attendance={selectedRecord}
          onClose={() => {
            setShowCorrection(false);
            setSelectedRecord(null);
          }}
          onSuccess={() => {
            fetchAttendance();
            fetchSummary();
          }}
        />
      )}
    </div>
  );
}
