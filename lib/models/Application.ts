/**
 * lib/models/Application.ts
 * A candidate's application to a job opening, including the resume file
 * (stored in MongoDB, never selected unless explicitly requested).
 */

import mongoose, { Schema, Document, Model } from "mongoose";
import {
  APPLICATION_SOURCES,
  APPLICATION_STATUS,
  type ApplicationSource,
  type ApplicationStatus,
} from "@/lib/recruitmentConstants";
 

export interface IStatusChange {
  status: ApplicationStatus;
  changedBy?: mongoose.Types.ObjectId;
  changedAt: Date;
  note?: string;
}

export interface IApplication extends Document {
  _id: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId; // ref → job_openings
  candidate: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  experienceYears?: number;
  currentCompany?: string;
  expectedSalary?: number;
  noticePeriodDays?: number;
  source: ApplicationSource;
  coverLetter?: string;
  resume?: {
    filename: string;
    contentType: string;
    size: number;
    data: Buffer;
  };
  status: ApplicationStatus;
  statusHistory: IStatusChange[];
  rating?: number; // 1–5
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "JobOpening", required: true },
    candidate: {
      firstName: { type: String, required: true, trim: true, maxlength: 100 },
      lastName: { type: String, required: true, trim: true, maxlength: 100 },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, trim: true, maxlength: 30 },
    },
    experienceYears: { type: Number, min: 0, max: 60 },
    currentCompany: { type: String, trim: true, maxlength: 150 },
    expectedSalary: { type: Number, min: 0 },
    noticePeriodDays: { type: Number, min: 0, max: 365 },
    source: { type: String, enum: APPLICATION_SOURCES, default: "website" },
    coverLetter: { type: String, trim: true, maxlength: 5000 },
    resume: {
      type: new Schema(
        {
          filename: { type: String, required: true },
          contentType: { type: String, required: true },
          size: { type: Number, required: true },
          data: { type: Buffer, required: true, select: false },
        },
        { _id: false },
      ),
    },
    status: { type: String, enum: APPLICATION_STATUS, default: "applied", required: true },
    statusHistory: {
      type: [
        new Schema<IStatusChange>(
          {
            status: { type: String, enum: APPLICATION_STATUS, required: true },
            changedBy: { type: Schema.Types.ObjectId, ref: "User" },
            changedAt: { type: Date, required: true },
            note: { type: String, trim: true, maxlength: 500 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    rating: { type: Number, min: 1, max: 5 },
    notes: { type: String, trim: true, maxlength: 5000 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    collection: "applications",
  },
);

applicationSchema.index({ jobId: 1, "candidate.email": 1 }, { unique: true });
applicationSchema.index({ status: 1, createdAt: -1 });

const Application: Model<IApplication> =
  (mongoose.models.Application as Model<IApplication>) ||
  mongoose.model<IApplication>("Application", applicationSchema);

export default Application;
