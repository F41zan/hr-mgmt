/**
 * lib/models/SalaryStructure.ts
 * Current monthly salary components for an employee (one per employee).
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISalaryStructure extends Document {
  _id: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId; // ref → employees
  // Monthly earnings
  basic: number;
  hra: number;
  specialAllowance: number;
  otherAllowances: number;
  // Deductions
  pfPercent: number; // % of earned basic
  professionalTax: number; // fixed monthly amount
  tdsPercent: number; // % of gross earnings
  otherDeductions: number; // fixed monthly amount
  effectiveFrom: Date;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const money = { type: Number, required: true, min: 0, default: 0 };

const salaryStructureSchema = new Schema<ISalaryStructure>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      unique: true,
    },
    basic: { type: Number, required: true, min: 0 },
    hra: money,
    specialAllowance: money,
    otherAllowances: money,
    pfPercent: { type: Number, min: 0, max: 100, default: 12 },
    professionalTax: { type: Number, min: 0, default: 200 },
    tdsPercent: { type: Number, min: 0, max: 100, default: 0 },
    otherDeductions: money,
    effectiveFrom: { type: Date, required: true, default: Date.now },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    collection: "salary_structures",
  },
);

const SalaryStructure: Model<ISalaryStructure> =
  (mongoose.models.SalaryStructure as Model<ISalaryStructure>) ||
  mongoose.model<ISalaryStructure>("SalaryStructure", salaryStructureSchema);

export default SalaryStructure;
