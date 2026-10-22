/**
 * lib/models/Employee.ts
 * HR domain model — linked to the `users` collection via userId ref.
 * Stored in the `employees` collection of the `hr-mgmt` database.
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export const EMPLOYMENT_STATUS = [
  "active",
  "inactive",
  "on_leave",
  "terminated",
] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUS)[number];

export const EMPLOYMENT_TYPE = [
  "full-time",
  "part-time",
  "contract",
  "intern",
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPE)[number];

export const GENDER = ["male", "female", "other", "prefer-not-to-say"] as const;
export type Gender = (typeof GENDER)[number];

export interface IEmployee extends Document {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId; // ref → users collection (optional for employees without login)
  employeeId: string; // e.g. "EMP001"
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profilePhoto?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  address?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  departmentId: mongoose.Types.ObjectId; // ref → departments
  designationId: mongoose.Types.ObjectId; // ref → designations
  managerId?: mongoose.Types.ObjectId; // ref → employees
  employmentType: EmploymentType;
  joiningDate: Date;
  status: EmploymentStatus;
  workLocation?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Computed property for full name
export interface IEmployeeDocument extends IEmployee {
  readonly fullName: string;
}

const employeeSchema = new Schema<IEmployee>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      sparse: true, // Allow null for employees without login accounts
    },
    employeeId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },
    profilePhoto: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: GENDER,
    },
    address: { type: String, trim: true, maxlength: 500 },
    emergencyContact: {
      name: { type: String, trim: true },
      relationship: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    designationId: {
      type: Schema.Types.ObjectId,
      ref: "Designation",
      required: true,
    },
    managerId: { type: Schema.Types.ObjectId, ref: "Employee" },
    employmentType: {
      type: String,
      enum: EMPLOYMENT_TYPE,
      required: true,
      default: "full-time",
    },
    joiningDate: { type: Date, required: true },
    status: {
      type: String,
      enum: EMPLOYMENT_STATUS,
      default: "active",
      required: true,
    },
    workLocation: { type: String, trim: true },
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  {
    timestamps: true,
    collection: "employees",
  },
);

// Virtual property for full name
employeeSchema.virtual("fullName").get(function (this: IEmployee) {
  return `${this.firstName} ${this.lastName}`;
});

employeeSchema.index({ status: 1 });
employeeSchema.index({ departmentId: 1 });
employeeSchema.index({ designationId: 1 });
employeeSchema.index({ joiningDate: 1 });
employeeSchema.index({ userId: 1 }, { sparse: true });
employeeSchema.index({ email: 1 }, { unique: true });

const Employee: Model<IEmployee> =
  (mongoose.models.Employee as Model<IEmployee>) ||
  mongoose.model<IEmployee>("Employee", employeeSchema);

export default Employee;
