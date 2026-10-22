/**
 * scripts/seed-admin.ts
 * One-time script to create the initial Admin account.
 *
 * Usage (run once, then remove credentials from .env.local):
 *   npx ts-node --project tsconfig.scripts.json scripts/seed-admin.ts
 *
 * Required environment variables:
 *   MONGODB_URI
 *   ADMIN_BOOTSTRAP_SECRET  (must match what you set in .env.local)
 *   ADMIN_SEED_NAME
 *   ADMIN_SEED_EMAIL
 *   ADMIN_SEED_PASSWORD
 *
 * Security notes:
 *  - This script must NEVER be exposed to the browser or called from an API.
 *  - Remove ADMIN_SEED_* variables from .env.local after first run.
 *  - The ADMIN_BOOTSTRAP_SECRET prevents accidental re-seeding.
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const {
  MONGODB_URI,
  ADMIN_BOOTSTRAP_SECRET,
  ADMIN_SEED_NAME,
  ADMIN_SEED_EMAIL,
  ADMIN_SEED_PASSWORD,
} = process.env;

if (!MONGODB_URI) {
  console.error("ERROR: MONGODB_URI is not set.");
  process.exit(1);
}

if (
  !ADMIN_BOOTSTRAP_SECRET ||
  ADMIN_BOOTSTRAP_SECRET ===
    "57e0e86b45e23e620dc16bda2d49189c4415d4bb9987fbc06958c42c2959a91a"
) {
  console.error(
    "ERROR: Set a real ADMIN_BOOTSTRAP_SECRET in .env.local first.",
  );
  process.exit(1);
}

if (!ADMIN_SEED_NAME || !ADMIN_SEED_EMAIL || !ADMIN_SEED_PASSWORD) {
  console.error(
    "ERROR: ADMIN_SEED_NAME, ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD must all be set.",
  );
  process.exit(1);
}

if (ADMIN_SEED_PASSWORD === "REPLACE_WITH_STRONG_PASSWORD") {
  console.error(
    "ERROR: Change ADMIN_SEED_PASSWORD from the placeholder value.",
  );
  process.exit(1);
}

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true, trim: true },
    passwordHash: String,
    role: { type: String, enum: ["admin", "hr", "employee"] },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
    resetTokenHash: String,
    resetTokenExpiry: Date,
    resetTokenUsed: Boolean,
  },
  { timestamps: true, collection: "users" },
);

async function main() {
  await mongoose.connect(MONGODB_URI as string, { dbName: "hr-mgmt" });
  console.log("Connected to MongoDB (hr-mgmt).");

  const User = mongoose.models.User ?? mongoose.model("User", userSchema);

  const email = ADMIN_SEED_EMAIL!.toLowerCase().trim();
  const existing = await User.findOne({ email });

  if (existing) {
    console.log(`Admin account already exists for ${email}. Nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_SEED_PASSWORD as string, 12);

  await User.create({
    name: ADMIN_SEED_NAME,
    email,
    passwordHash,
    role: "admin",
    isActive: true,
  });

  console.log(`✓ Admin account created: ${email}`);
  console.log("IMPORTANT: Remove ADMIN_SEED_* variables from .env.local now.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", (err as Error).message);
  process.exit(1);
});
