/**
 * lib/models/Payslip.ts
 * Monthly salary record. Values are snapshotted at generation time so later
 * changes to the employee or salary structure don't alter issued payslips.
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export const PAYSLIP_STATUS = ["draft", "published"] as const;
export type PayslipStatus = (typeof PAYSLIP_STATUS)[number];

export interface IPayslipLine {
  label: string;
  amount: number;
}

export interface IPayslip extends Document {
  _id: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId; // ref → employees
  month: string; // YYYY-MM
  employee: {
    name: string;
    code: string;
    email: string;
    department?: string;
    designation?: string;
    joiningDate?: Date;
  };
  workingDays: number; // working days in the month
  paidDays: number;
  lopDays: number; // loss of pay
  earnings: IPayslipLine[];
  deductions: IPayslipLine[];
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  status: PayslipStatus;
  generatedBy?: mongoose.Types.ObjectId;
  publishedAt?: Date;
  publishedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const lineSchema = new Schema<IPayslipLine>(
  {
    label: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false },
);

const payslipSchema = new Schema<IPayslip>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    employee: {
      name: { type: String, required: true },
      code: { type: String, required: true },
      email: { type: String, required: true },
      department: String,
      designation: String,
      joiningDate: Date,
    },
    workingDays: { type: Number, required: true, min: 0 },
    paidDays: { type: Number, required: true, min: 0 },
    lopDays: { type: Number, required: true, min: 0 },
    earnings: { type: [lineSchema], default: [] },
    deductions: { type: [lineSchema], default: [] },
    grossEarnings: { type: Number, required: true, min: 0 },
    totalDeductions: { type: Number, required: true, min: 0 },
    netPay: { type: Number, required: true, min: 0 },
    status: { type: String, enum: PAYSLIP_STATUS, default: "draft", required: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    publishedAt: Date,
    publishedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    collection: "payslips",
  },
);

payslipSchema.index({ employeeId: 1, month: 1 }, { unique: true });
payslipSchema.index({ month: 1, status: 1 });

const Payslip: Model<IPayslip> =
  (mongoose.models.Payslip as Model<IPayslip>) ||
  mongoose.model<IPayslip>("Payslip", payslipSchema);

export default Payslip;
