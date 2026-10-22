/**
 * lib/models/Designation.ts
 * Designation (job title) management model, belongs to a department.
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export const DESIGNATION_STATUS = ["active", "inactive"] as const;
export type DesignationStatus = (typeof DESIGNATION_STATUS)[number];

export interface IDesignation extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  departmentId: mongoose.Types.ObjectId;
  description?: string;
  status: DesignationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const designationSchema = new Schema<IDesignation>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: DESIGNATION_STATUS,
      default: "active",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "designations",
  },
);

// Compound index for unique designation name within department
designationSchema.index({ departmentId: 1, name: 1 }, { unique: true });
designationSchema.index({ status: 1 });
designationSchema.index({ departmentId: 1 });

const Designation: Model<IDesignation> =
  (mongoose.models.Designation as Model<IDesignation>) ||
  mongoose.model<IDesignation>("Designation", designationSchema);

export default Designation;
