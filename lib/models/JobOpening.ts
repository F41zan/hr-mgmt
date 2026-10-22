/**
 * lib/models/JobOpening.ts
 * Open positions for recruitment.
 */

import mongoose, { Schema, Document, Model } from "mongoose";
import { JOB_STATUS, type JobStatus } from "@/lib/recruitmentConstants";
import { EMPLOYMENT_TYPE, type EmploymentType } from "@/lib/models/Employee";

export interface IJobOpening extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  departmentId: mongoose.Types.ObjectId; // ref → departments
  designationId?: mongoose.Types.ObjectId; // ref → designations
  description: string;
  requirements?: string;
  location?: string;
  employmentType: EmploymentType;
  openings: number;
  experienceMin?: number;
  experienceMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  closingDate?: Date;
  status: JobStatus;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const jobOpeningSchema = new Schema<IJobOpening>(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    designationId: { type: Schema.Types.ObjectId, ref: "Designation" },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    requirements: { type: String, trim: true, maxlength: 5000 },
    location: { type: String, trim: true, maxlength: 150 },
    employmentType: { type: String, enum: EMPLOYMENT_TYPE, default: "full-time", required: true },
    openings: { type: Number, required: true, min: 1, default: 1 },
    experienceMin: { type: Number, min: 0 },
    experienceMax: { type: Number, min: 0 },
    salaryMin: { type: Number, min: 0 },
    salaryMax: { type: Number, min: 0 },
    closingDate: { type: Date },
    status: { type: String, enum: JOB_STATUS, default: "open", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    collection: "job_openings",
  },
);

jobOpeningSchema.index({ status: 1, createdAt: -1 });
jobOpeningSchema.index({ departmentId: 1 });

const JobOpening: Model<IJobOpening> =
  (mongoose.models.JobOpening as Model<IJobOpening>) ||
  mongoose.model<IJobOpening>("JobOpening", jobOpeningSchema);

export default JobOpening;
