/**
 * lib/models/Department.ts
 * Department management model for the HR system.
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export const DEPARTMENT_STATUS = ["active", "inactive"] as const;
export type DepartmentStatus = (typeof DEPARTMENT_STATUS)[number];

export interface IDepartment extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  headEmployeeId?: mongoose.Types.ObjectId;
  status: DepartmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 20,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    headEmployeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },
    status: {
      type: String,
      enum: DEPARTMENT_STATUS,
      default: "active",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "departments",
  },
);

// Indexes for performance
departmentSchema.index({ status: 1 });
departmentSchema.index({ name: 1 });
departmentSchema.index({ code: 1 }, { unique: true });

const Department: Model<IDepartment> =
  (mongoose.models.Department as Model<IDepartment>) ||
  mongoose.model<IDepartment>("Department", departmentSchema);

export default Department;
