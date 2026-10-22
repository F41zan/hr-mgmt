/**
 * __tests__/utils.test.ts
 * Date helpers, CSV export, permissions and recruitment pipeline rules.
 */

import {
  eachDate,
  formatMonth,
  isValidDateString,
  monthRange,
  workingDaysBetween,
} from "@/lib/utils/dates";
import { toCsv } from "@/lib/utils/csv";
import { DEFAULT_PERMISSIONS, hasPermission } from "@/lib/permissions";
import { STATUS_TRANSITIONS } from "@/lib/recruitmentConstants";

describe("date helpers", () => {
  it("validates real calendar dates only", () => {
    expect(isValidDateString("2026-02-28")).toBe(true);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("2026-2-3")).toBe(false);
    expect(isValidDateString(undefined)).toBe(false);
  });

  it("lists dates inclusively across a month boundary", () => {
    expect(eachDate("2026-01-30", "2026-02-02")).toEqual([
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-02",
    ]);
  });

  it("excludes weekends from working days", () => {
    // 2026-10-23 is a Friday, 24/25 weekend, 26 Monday
    expect(workingDaysBetween("2026-10-23", "2026-10-26")).toEqual(["2026-10-23", "2026-10-26"]);
    expect(workingDaysBetween("2026-10-24", "2026-10-25")).toEqual([]);
  });

  it("computes month ranges including leap years", () => {
    expect(monthRange("2028-02")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(monthRange("2026-12")).toEqual({ start: "2026-12-01", end: "2026-12-31" });
    expect(formatMonth("2026-10")).toBe("October 2026");
  });
});

describe("toCsv", () => {
  it("quotes commas, quotes and newlines", () => {
    const csv = toCsv(["a", "b"], [["x,y", 'say "hi"'], ["line\nbreak", 3]]);
    expect(csv).toBe('﻿a,b\r\n"x,y","say ""hi"""\r\n"line\nbreak",3');
  });

  it("neutralises spreadsheet formula injection", () => {
    const csv = toCsv(["v"], [["=HYPERLINK(\"http://evil\")"], ["+1"], [-5]]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+1");
    expect(csv).toContain("\r\n-5"); // real negative numbers are untouched
  });
});

describe("permissions", () => {
  it("admin always has every permission", () => {
    expect(hasPermission("admin", [], "audit.view")).toBe(true);
  });

  it("HR defaults allow payroll but not audit logs", () => {
    expect(hasPermission("hr", DEFAULT_PERMISSIONS.hr, "payroll.manage")).toBe(true);
    expect(hasPermission("hr", DEFAULT_PERMISSIONS.hr, "audit.view")).toBe(false);
  });

  it("employees have no management permissions by default", () => {
    expect(DEFAULT_PERMISSIONS.employee).toEqual([]);
  });
});

describe("recruitment pipeline", () => {
  it("hired and withdrawn are terminal", () => {
    expect(STATUS_TRANSITIONS.hired).toEqual([]);
    expect(STATUS_TRANSITIONS.withdrawn).toEqual([]);
  });

  it("an offer is required before hiring", () => {
    expect(STATUS_TRANSITIONS.applied).not.toContain("hired");
    expect(STATUS_TRANSITIONS.interview).not.toContain("hired");
    expect(STATUS_TRANSITIONS.offered).toContain("hired");
  });
});
