/**
 * lib/models/Notification.ts
 * In-app notifications for a single user.
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export const NOTIFICATION_TYPES = [
  "leave",
  "interview",
  "payslip",
  "system",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // ref → users
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  readAt?: Date;
  dedupeKey?: string; // prevents duplicate reminders
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    link: { type: String, trim: true },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    dedupeKey: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: "notifications",
  },
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index(
  { userId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } },
);

const Notification: Model<INotification> =
  (mongoose.models.Notification as Model<INotification>) ||
  mongoose.model<INotification>("Notification", notificationSchema);

export default Notification;
