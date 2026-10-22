/**
 * lib/recruitmentConstants.ts
 * Recruitment enums. Safe to import from client components.
 */

export const JOB_STATUS = ["open", "on_hold", "closed"] as const;
export type JobStatus = (typeof JOB_STATUS)[number];

export const APPLICATION_STATUS = [
  "applied",
  "screening",
  "interview",
  "offered",
  "hired",
  "rejected",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUS)[number];

/** Allowed next statuses — keeps the pipeline moving in a sensible order. */
export const STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  applied: ["screening", "interview", "rejected", "withdrawn"],
  screening: ["interview", "offered", "rejected", "withdrawn"],
  interview: ["offered", "rejected", "withdrawn", "screening"],
  offered: ["hired", "rejected", "withdrawn"],
  hired: [],
  rejected: ["screening"], // allow reconsideration
  withdrawn: [],
};

export const APPLICATION_SOURCES = [
  "website",
  "referral",
  "linkedin",
  "job_board",
  "agency",
  "other",
] as const;
export type ApplicationSource = (typeof APPLICATION_SOURCES)[number];

export const INTERVIEW_TYPES = ["phone", "video", "onsite", "technical", "hr"] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEW_STATUS = ["scheduled", "completed", "cancelled", "no_show"] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUS)[number];

export const INTERVIEW_RESULTS = ["pass", "fail", "hold"] as const;
export type InterviewResult = (typeof INTERVIEW_RESULTS)[number];

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
export const RESUME_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};
