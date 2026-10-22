/**
 * lib/utils/attendance.ts
 * Attendance calculation and utility functions
 */

/**
 * Business timezone for attendance calculations
 * All canonical attendance dates and time comparisons use this timezone
 */
export const BUSINESS_TIMEZONE = "Asia/Kolkata";

/**
 * Default attendance policy configuration
 */
export const ATTENDANCE_POLICY = {
  standardStartTime: "09:00", // HH:mm format
  standardEndTime: "18:00",
  lateGracePeriodMinutes: 0,
  earlyDepartureGracePeriodMinutes: 0,
  expectedWorkdayDurationMinutes: 480, // 8 hours
  halfDayThresholdMinutes: 240, // 4 hours
} as const;

/**
 * Get canonical attendance date in business timezone
 * Returns date as YYYY-MM-DD string in business timezone
 */
export function getCanonicalAttendanceDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Parse date string to Date object at start of day in business timezone
 */
export function parseAttendanceDate(dateString: string): Date {
  // dateString format: YYYY-MM-DD
  const [year, month, day] = dateString.split("-").map(Number);

  // Create date at midnight in business timezone
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00`;

  // Parse in business timezone
  return new Date(
    new Date(dateStr).toLocaleString("en-US", { timeZone: BUSINESS_TIMEZONE }),
  );
}

/**
 * Get current time in business timezone
 */
export function getCurrentTimeInBusinessTZ(): Date {
  const now = new Date();
  const tzString = now.toLocaleString("en-US", { timeZone: BUSINESS_TIMEZONE });
  return new Date(tzString);
}

/**
 * Calculate working duration in minutes between check-in and check-out
 */
export function calculateWorkingDuration(
  checkInAt: Date,
  checkOutAt: Date,
): number {
  if (!checkInAt || !checkOutAt) return 0;
  if (checkOutAt <= checkInAt) return 0;

  const durationMs = checkOutAt.getTime() - checkInAt.getTime();
  return Math.floor(durationMs / (1000 * 60)); // Convert to minutes
}

/**
 * Format working duration for display (e.g., "8h 25m")
 */
export function formatWorkingDuration(minutes: number): string {
  if (!minutes || minutes < 0) return "0h 0m";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${hours}h ${mins}m`;
}

/**
 * Check if employee is late based on check-in time
 */
export function calculateLateArrival(checkInAt: Date): {
  isLate: boolean;
  lateMinutes: number;
} {
  if (!checkInAt) return { isLate: false, lateMinutes: 0 };

  // Get check-in time components
  const checkInTimeStr = checkInAt.toLocaleTimeString("en-GB", {
    timeZone: BUSINESS_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const [checkInHour, checkInMinute] = checkInTimeStr.split(":").map(Number);
  const [standardHour, standardMinute] = ATTENDANCE_POLICY.standardStartTime
    .split(":")
    .map(Number);

  // Calculate minutes from midnight
  const checkInMinutesFromMidnight = checkInHour * 60 + checkInMinute;
  const standardMinutesFromMidnight = standardHour * 60 + standardMinute;

  // Calculate late minutes
  const lateMinutes = Math.max(
    0,
    checkInMinutesFromMidnight -
      standardMinutesFromMidnight -
      ATTENDANCE_POLICY.lateGracePeriodMinutes,
  );

  return {
    isLate: lateMinutes > 0,
    lateMinutes,
  };
}

/**
 * Check if employee departed early based on check-out time
 */
export function calculateEarlyDeparture(checkOutAt: Date): {
  isEarlyDeparture: boolean;
  earlyDepartureMinutes: number;
} {
  if (!checkOutAt) return { isEarlyDeparture: false, earlyDepartureMinutes: 0 };

  // Get check-out time components
  const checkOutTimeStr = checkOutAt.toLocaleTimeString("en-GB", {
    timeZone: BUSINESS_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const [checkOutHour, checkOutMinute] = checkOutTimeStr.split(":").map(Number);
  const [standardHour, standardMinute] = ATTENDANCE_POLICY.standardEndTime
    .split(":")
    .map(Number);

  // Calculate minutes from midnight
  const checkOutMinutesFromMidnight = checkOutHour * 60 + checkOutMinute;
  const standardMinutesFromMidnight = standardHour * 60 + standardMinute;

  // Calculate early departure minutes
  const earlyMinutes = Math.max(
    0,
    standardMinutesFromMidnight -
      checkOutMinutesFromMidnight -
      ATTENDANCE_POLICY.earlyDepartureGracePeriodMinutes,
  );

  return {
    isEarlyDeparture: earlyMinutes > 0,
    earlyDepartureMinutes: earlyMinutes,
  };
}

/**
 * Determine attendance status based on working duration
 */
export function determineAttendanceStatus(
  workingDurationMinutes: number | undefined,
  hasCheckOut: boolean,
): "present" | "half-day" | "absent" {
  if (!workingDurationMinutes || !hasCheckOut) {
    return "present"; // Incomplete record, don't auto-classify as absent
  }

  if (
    workingDurationMinutes >= ATTENDANCE_POLICY.expectedWorkdayDurationMinutes
  ) {
    return "present";
  } else if (
    workingDurationMinutes >= ATTENDANCE_POLICY.halfDayThresholdMinutes
  ) {
    return "half-day";
  } else {
    return "half-day"; // Less than half day threshold
  }
}

/**
 * Get month boundaries in business timezone
 */
export function getMonthBoundaries(
  year: number,
  month: number,
): {
  start: Date;
  end: Date;
} {
  // month is 1-indexed (1 = January, 12 = December)
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  return {
    start: startDate,
    end: endDate,
  };
}

/**
 * Get days in month
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Format time for display
 */
export function formatTime(date: Date | undefined): string {
  if (!date) return "--:--";

  return date.toLocaleTimeString("en-US", {
    timeZone: BUSINESS_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;

  return d.toLocaleDateString("en-US", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Check if a date is today in business timezone
 */
export function isToday(date: Date | string): boolean {
  const checkDate =
    typeof date === "string" ? date : getCanonicalAttendanceDate(date);
  const today = getCanonicalAttendanceDate();
  return checkDate === today;
}

/**
 * Check if date is in the future
 */
export function isFutureDate(dateString: string): boolean {
  const today = getCanonicalAttendanceDate();
  return dateString > today;
}
