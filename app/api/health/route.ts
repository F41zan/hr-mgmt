/**
 * GET /api/health
 * Quick diagnostic — checks MongoDB connection and shows user count.
 * Visit http://localhost:3000/api/health in your browser to diagnose issues.
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";

export async function GET() {
  try {
    await connectDB();
    const userCount = await User.countDocuments();
    const adminExists = await User.findOne({ role: "admin" }).select(
      "email name role isActive",
    );

    return NextResponse.json({
      status: "ok",
      database: "connected",
      dbName: "hr-mgmt",
      userCount,
      adminAccount: adminExists
        ? {
            email: adminExists.email,
            name: adminExists.name,
            role: adminExists.role,
            isActive: adminExists.isActive,
          }
        : "not created yet — will be created on next request",
    });
  } catch (err) {
    const msg = (err as Error).message ?? "Unknown error";
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        error: msg,
        fix:
          msg.includes("ECONNREFUSED") || msg.includes("connect")
            ? "MongoDB is not running. Start it with: net start MongoDB  (or open Services and start MongoDB)"
            : "Check your MONGODB_URI in .env.local",
      },
      { status: 500 },
    );
  }
}
