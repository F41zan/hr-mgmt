import type {
  ApplicationStatus,
  InterviewResult,
  InterviewStatus,
  InterviewType,
  JobStatus,
} from "@/lib/recruitmentConstants";

export interface JobRow {
  _id: string;
  title: string;
  departmentId?: { _id: string; name: string };
  designationId?: { _id: string; name: string };
  description: string;
  requirements?: string;
  location?: string;
  employmentType: string;
  openings: number;
  experienceMin?: number;
  experienceMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  closingDate?: string;
  status: JobStatus;
  createdAt: string;
  applicationCount?: number;
  byStatus?: Record<string, number>;
}

export interface ApplicationRow {
  _id: string;
  jobId?: { _id: string; title: string; status: string };
  candidate: { firstName: string; lastName: string; email: string; phone?: string };
  experienceYears?: number;
  currentCompany?: string;
  expectedSalary?: number;
  noticePeriodDays?: number;
  source: string;
  coverLetter?: string;
  resume?: { filename: string; contentType: string; size: number };
  status: ApplicationStatus;
  statusHistory?: { status: ApplicationStatus; changedBy?: { name: string }; changedAt: string; note?: string }[];
  rating?: number;
  notes?: string;
  createdAt: string;
}

export interface InterviewRow {
  _id: string;
  applicationId:
    | string
    | { _id: string; candidate: ApplicationRow["candidate"]; status: ApplicationStatus; resume?: { filename: string } };
  jobId?: { _id: string; title: string } | string;
  round: number;
  type: InterviewType;
  scheduledAt: string;
  durationMinutes: number;
  location?: string;
  interviewers: { _id: string; name: string; email: string }[];
  status: InterviewStatus;
  feedback?: string;
  rating?: number;
  result?: InterviewResult;
}

export interface Option {
  id: string;
  name: string;
}
