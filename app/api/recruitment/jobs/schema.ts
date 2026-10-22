/**
 * Shared validation for job opening create/update.
 */

import mongoose from "mongoose";
import { z } from "zod";
import { JOB_STATUS } from "@/lib/recruitmentConstants";
import { isValidDateString } from "@/lib/utils/dates";
import { parseAttendanceDate } from "@/lib/utils/attendance";

const objectId = z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), "Invalid ID");
const optionalNumber = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z.coerce.number().min(0).optional(),
);

export const jobSchema = z
  .object({
    title: z.string().trim().min(2, "Title is required").max(150),
    departmentId: objectId,
    designationId: z.preprocess((v) => (v === "" ? undefined : v), objectId.optional()),
    description: z.string().trim().min(10, "Description must be at least 10 characters").max(5000),
    requirements: z.string().trim().max(5000).optional(),
    location: z.string().trim().max(150).optional(),
    employmentType: z.enum(["full-time", "part-time", "contract", "intern"]).default("full-time"),
    openings: z.coerce.number().int().min(1).max(500).default(1),
    experienceMin: optionalNumber,
    experienceMax: optionalNumber,
    salaryMin: optionalNumber,
    salaryMax: optionalNumber,
    closingDate: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.string().refine(isValidDateString, "Invalid date").optional(),
    ),
    status: z.enum(JOB_STATUS).default("open"),
  })
  .refine(
    (d) => d.salaryMin === undefined || d.salaryMax === undefined || d.salaryMin <= d.salaryMax,
    { message: "Minimum salary cannot exceed maximum", path: ["salaryMax"] },
  )
  .refine(
    (d) => d.experienceMin === undefined || d.experienceMax === undefined || d.experienceMin <= d.experienceMax,
    { message: "Minimum experience cannot exceed maximum", path: ["experienceMax"] },
  );

export type JobInput = z.infer<typeof jobSchema>;

export function toJobDoc(input: JobInput) {
  const { closingDate, ...rest } = input;
  return {
    ...rest,
    closingDate: closingDate ? parseAttendanceDate(closingDate) : undefined,
  };
}
