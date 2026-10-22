"use client";

import { useState } from "react";
import { formatTime, formatDate } from "@/lib/utils/attendance";

interface CorrectionModalProps {
  attendance: {
    _id: string;
    attendanceDate: string;
    checkInAt?: string;
    checkOutAt?: string;
    status: string;
    workingDurationMinutes?: number;
    employeeId: {
      firstName: string;
      lastName: string;
      employeeId: string;
    };
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function CorrectionModal({
  attendance,
  onClose,
  onSuccess,
}: CorrectionModalProps) {
  const [checkInAt, setCheckInAt] = useState(
    attendance.checkInAt
      ? new Date(attendance.checkInAt).toISOString().slice(0, 16)
      : "",
  );
  const [checkOutAt, setCheckOutAt] = useState(
    attendance.checkOutAt
      ? new Date(attendance.checkOutAt).toISOString().slice(0, 16)
      : "",
  );
  const [status, setStatus] = useState(attendance.status);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (reason.trim().length < 5) {
      setError("Reason must be at least 5 characters");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/attendance/${attendance._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkInAt: checkInAt || undefined,
          checkOutAt: checkOutAt || undefined,
          status,
          reason: reason.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to correct attendance");
      }

      alert("Attendance corrected successfully");
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to correct attendance",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">
            Correct Attendance
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Employee Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-[var(--color-text)]">
              {attendance.employeeId.firstName} {attendance.employeeId.lastName}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {attendance.employeeId.employeeId} •{" "}
              {formatDate(attendance.attendanceDate)}
            </p>
          </div>

          {/* Current Values */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">
              Current Values
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[var(--color-text-secondary)]">Check In:</p>
                <p className="font-medium">
                  {attendance.checkInAt
                    ? formatTime(new Date(attendance.checkInAt))
                    : "Not recorded"}
                </p>
              </div>
              <div>
                <p className="text-[var(--color-text-secondary)]">Check Out:</p>
                <p className="font-medium">
                  {attendance.checkOutAt
                    ? formatTime(new Date(attendance.checkOutAt))
                    : "Not recorded"}
                </p>
              </div>
            </div>
          </div>

          {/* Correction Form */}
          <div className="space-y-4">
            <div>
              <label className="form-label">Check-In Time</label>
              <input
                type="datetime-local"
                value={checkInAt}
                onChange={(e) => setCheckInAt(e.target.value)}
                className="form-input"
              />
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Leave empty to keep current value
              </p>
            </div>

            <div>
              <label className="form-label">Check-Out Time</label>
              <input
                type="datetime-local"
                value={checkOutAt}
                onChange={(e) => setCheckOutAt(e.target.value)}
                className="form-input"
              />
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Leave empty to keep current value
              </p>
            </div>

            <div>
              <label className="form-label">Attendance Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="form-input"
                required
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="half-day">Half Day</option>
                <option value="on-leave">On Leave</option>
              </select>
            </div>

            <div>
              <label className="form-label">
                Correction Reason <span className="text-red-600">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this correction is being made (minimum 5 characters)"
                rows={3}
                className="form-input"
                required
                minLength={5}
                maxLength={500}
              />
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                {reason.length}/500 characters
              </p>
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
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

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-6"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-6"
              disabled={loading || reason.trim().length < 5}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="spinner"></span>
                  Saving...
                </span>
              ) : (
                "Save Correction"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
