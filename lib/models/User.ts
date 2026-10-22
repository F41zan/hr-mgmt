/**
 * lib/models/User.ts
 * Mongoose User model for the `hr-mgmt` database, `users` collection.
 * The existing `employees` collection is untouched.
 */

import mongoose, { Schema, Document, Model } from "mongoose";
import { ROLE_VALUES, type Role } from "@/lib/roles";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string; // stored lower-cased + trimmed
  passwordHash: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  // Password-reset fields
  resetTokenHash?: string;
  resetTokenExpiry?: Date;
  resetTokenUsed?: boolean;
}

// Safe public representation — never includes passwordHash or token fields
export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
};

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name must be ≤ 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address"],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // never returned unless explicitly requested
    },
    role: {
      type: String,
      enum: {
        values: ROLE_VALUES,
        message: "Role must be admin, hr, or employee",
      },
      required: [true, "Role is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
    // Password-reset  (not selected by default)
    resetTokenHash: { type: String, select: false },
    resetTokenExpiry: { type: Date, select: false },
    resetTokenUsed: { type: Boolean, select: false },
  },
  {
    timestamps: true, // createdAt + updatedAt managed by Mongoose
    collection: "users", // dedicated collection; employees collection is separate
  },
);

// Compound index: unique email (already enforced above) + role queries
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ resetTokenHash: 1 }, { sparse: true });

/** Strip sensitive fields before converting to plain object. */
userSchema.methods.toSafeObject = function (): SafeUser {
  return {
    id: (this._id as mongoose.Types.ObjectId).toString(),
    name: this.name as string,
    email: this.email as string,
    role: this.role as Role,
    isActive: this.isActive as boolean,
    lastLoginAt: this.lastLoginAt
      ? (this.lastLoginAt as Date).toISOString()
      : undefined,
    createdAt: (this.createdAt as Date).toISOString(),
  };
};

// Prevent model redefinition during hot-reload in development
const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", userSchema);

export default User;
