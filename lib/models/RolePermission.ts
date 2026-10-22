/**
 * lib/models/RolePermission.ts
 * Admin-editable permission set for the HR and Employee roles.
 */

import mongoose, { Schema, Document, Model } from "mongoose";
import { PERMISSION_VALUES, type Permission } from "@/lib/permissions";

export interface IRolePermission extends Document {
  _id: mongoose.Types.ObjectId;
  role: "hr" | "employee";
  permissions: Permission[];
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const rolePermissionSchema = new Schema<IRolePermission>(
  {
    role: {
      type: String,
      enum: ["hr", "employee"],
      required: true,
      unique: true,
    },
    permissions: {
      type: [{ type: String, enum: PERMISSION_VALUES }],
      default: [],
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    collection: "role_permissions",
  },
);

const RolePermission: Model<IRolePermission> =
  (mongoose.models.RolePermission as Model<IRolePermission>) ||
  mongoose.model<IRolePermission>("RolePermission", rolePermissionSchema);

export default RolePermission;
