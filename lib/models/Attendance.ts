/**
 * lib/models/Attendance.ts
 * Attendance management model for the HR system.
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export const ATTENDANCE_STATUS = [
  "present",
  "absent",
  "half-day",
  "on-leave",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[number];

export interface ICorrectionHistory {
  correctedBy: mongoose.Types.ObjectId; // ref → User
  correctedAt: Date;
  reason: string;
  previousValues: {
    checkInAt?: Date;
    checkOutAt?: Date;
    status?: AttendanceStatus;
    workingDurationMinutes?: number;
  };
  newValues: {
    checkInAt?: Date;
    checkOutAt?: Date;
    status?: AttendanceStatus;
    workingDurationMinutes?: number;
  };
}

export interface IAttendance extends Document {
  _id: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId; // ref → Employee
  attendanceDate: Date; // Canonical working date (YYYY-MM-DD in business timezone)
  checkInAt?: Date;
  checkOutAt?: Date;
  workingDurationMinutes?: number; // Calculated working duration
  status: AttendanceStatus;
  isLate: boolean;
  lateMinutes: number;
  isEarlyDeparture: boolean;
  earlyDepartureMinutes: number;
  isManuallyCorrected: boolean;
  correctionHistory: ICorrectionHistory[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const correctionHistorySchema = new Schema<ICorrectionHistory>(
  {
    correctedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    correctedAt: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 500,
    },
    previousValues: {
      checkInAt: Date,
      checkOutAt: Date,
      status: {
        type: String,
        enum: ATTENDANCE_STATUS,
      },
      workingDurationMinutes: Number,
    },
    newValues: {
      checkInAt: Date,
      checkOutAt: Date,
      status: {
        type: String,
        enum: ATTENDANCE_STATUS,
      },
      workingDurationMinutes: Number,
    },
  },
  { _id: false },
);

const attendanceSchema = new Schema<IAttendance>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    attendanceDate: {
      type: Date,
      required: true,
    },
    checkInAt: {
      type: Date,
    },
    checkOutAt: {
      type: Date,
    },
    workingDurationMinutes: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: ATTENDANCE_STATUS,
      required: true,
      default: "present",
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    lateMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    isEarlyDeparture: {
      type: Boolean,
      default: false,
    },
    earlyDepartureMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    isManuallyCorrected: {
      type: Boolean,
      default: false,
    },
    correctionHistory: {
      type: [correctionHistorySchema],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    collection: "attendance",
  },
);

// Unique compound index: one attendance record per employee per day
attendanceSchema.index({ employeeId: 1, attendanceDate: 1 }, { unique: true });

// Indexes for common queries
attendanceSchema.index({ attendanceDate: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ employeeId: 1, attendanceDate: -1 });
attendanceSchema.index({ isLate: 1, attendanceDate: -1 });
attendanceSchema.index({ createdAt: -1 });

const Attendance: Model<IAttendance> =
  (mongoose.models.Attendance as Model<IAttendance>) ||
  mongoose.model<IAttendance>("Attendance", attendanceSchema);

export default Attendance;
