/**
 * lib/db.ts
 * Singleton MongoDB connection. Auto-seeds admin + demo data on first run.
 */

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error(
    "MONGODB_URI is not set. Add it to .env.local before starting.",
  );
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache:
    | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
    | undefined;
}

const cached = (global._mongooseCache ??= { conn: null, promise: null });

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { bufferCommands: false, dbName: "hr-mgmt" })
      .then(async (m) => {
        await seedDefaultAdmin();
        const { seedDemoData } = await import("./seedDemoData");
        await seedDemoData();
        return m;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

async function seedDefaultAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME ?? "System Admin";
    if (!adminEmail || !adminPassword) return;

    const User = (await import("./models/User")).default;
    const bcrypt = await import("bcryptjs");

    const existing = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existing) return;

    const passwordHash = await bcrypt.default.hash(adminPassword, 12);
    await User.create({
      name: adminName,
      email: adminEmail.toLowerCase().trim(),
      passwordHash,
      role: "admin",
      isActive: true,
    });
    console.info(`[hr-mgmt] ✓ Default admin created: ${adminEmail}`);
  } catch (err) {
    console.warn("[hr-mgmt] Auto-seed admin skipped:", (err as Error).message);
  }
}
