/**
 * lib/models/AuditLog.ts
 * Append-only security audit trail.
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  actorId?: mongoose.Types.ObjectId; // ref → users (absent for anonymous events)
  actorName?: string;
  actorRole?: string;
  action: string; // e.g. "leave.approve", "auth.login_failed"
  entity: string; // e.g. "Leave", "User"
  entityId?: string;
  summary: string;
  details?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    actorName: { type: String, trim: true },
    actorRole: { type: String, trim: true },
    action: { type: String, required: true, trim: true },
    entity: { type: String, required: true, trim: true },
    entityId: { type: String, trim: true },
    summary: { type: String, required: true, trim: true, maxlength: 500 },
    details: { type: Schema.Types.Mixed },
    ip: { type: String, trim: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "audit_logs",
  },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, action: 1 });

const AuditLog: Model<IAuditLog> =
  (mongoose.models.AuditLog as Model<IAuditLog>) ||
  mongoose.model<IAuditLog>("AuditLog", auditLogSchema);

export default AuditLog;
