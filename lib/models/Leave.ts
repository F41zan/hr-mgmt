/**
 * lib/models/Leave.ts
 * Leave requests model.
 */

import mongoose, { Schema, Document, Model } from "mongoose";

import {
  LEAVE_TYPES,
  LEAVE_STATUS,
  type LeaveType,
  type LeaveStatus,
} from "@/lib/leavePolicy";

export { LEAVE_TYPES, LEAVE_STATUS, type LeaveType, type LeaveStatus };

export interface ILeave extends Document {
  _id: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId; // ref → employees
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  isHalfDay?: boolean;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: mongoose.Types.ObjectId; // ref → users (admin/hr who reviewed)
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const leaveSchema = new Schema<ILeave>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    leaveType: {
      type: String,
      enum: LEAVE_TYPES,
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, required: true, min: 0.5 },
    isHalfDay: { type: Boolean, default: false },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: LEAVE_STATUS,
      default: "pending",
      required: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNotes: { type: String },
  },
  {
    timestamps: true,
    collection: "leaves",
  },
);

leaveSchema.index({ employeeId: 1, status: 1 });
leaveSchema.index({ status: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });

const Leave: Model<ILeave> =
  (mongoose.models.Leave as Model<ILeave>) ||
  mongoose.model<ILeave>("Leave", leaveSchema);

export default Leave;
