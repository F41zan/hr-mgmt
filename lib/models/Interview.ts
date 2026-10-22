/**
 * lib/models/Interview.ts
 * Interview rounds scheduled for an application.
 */

import mongoose, { Schema, Document, Model } from "mongoose";
import {
  INTERVIEW_RESULTS,
  INTERVIEW_STATUS,
  INTERVIEW_TYPES,
  type InterviewResult,
  type InterviewStatus,
  type InterviewType,
} from "@/lib/recruitmentConstants";

export interface IInterview extends Document {
  _id: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId; // ref → applications
  jobId: mongoose.Types.ObjectId; // ref → job_openings (denormalised for queries)
  round: number;
  type: InterviewType;
  scheduledAt: Date;
  durationMinutes: number;
  location?: string; // room or meeting link
  interviewers: mongoose.Types.ObjectId[]; // ref → users
  status: InterviewStatus;
  feedback?: string;
  rating?: number; // 1–5
  result?: InterviewResult;
  reminderSent: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const interviewSchema = new Schema<IInterview>(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true },
    jobId: { type: Schema.Types.ObjectId, ref: "JobOpening", required: true },
    round: { type: Number, required: true, min: 1, default: 1 },
    type: { type: String, enum: INTERVIEW_TYPES, required: true, default: "video" },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 15, max: 480, default: 60 },
    location: { type: String, trim: true, maxlength: 500 },
    interviewers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    status: { type: String, enum: INTERVIEW_STATUS, default: "scheduled", required: true },
    feedback: { type: String, trim: true, maxlength: 5000 },
    rating: { type: Number, min: 1, max: 5 },
    result: { type: String, enum: INTERVIEW_RESULTS },
    reminderSent: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    collection: "interviews",
  },
);

interviewSchema.index({ scheduledAt: 1, status: 1 });
interviewSchema.index({ applicationId: 1, round: 1 });
interviewSchema.index({ interviewers: 1, scheduledAt: 1 });

const Interview: Model<IInterview> =
  (mongoose.models.Interview as Model<IInterview>) ||
  mongoose.model<IInterview>("Interview", interviewSchema);

export default Interview;
