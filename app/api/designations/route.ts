/**
 * GET /api/designations - List designations with optional department filter
 * POST /api/designations - Create a new designation (admin/hr only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/lib/dal";
import { connectDB } from "@/lib/db";
import Designation from "@/lib/models/Designation";
import Department from "@/lib/models/Department";
import Employee from "@/lib/models/Employee";

export async function GET(req: NextRequest) {
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    await connectDB();

    const { searchParams } = req.nextUrl;
    const departmentId = searchParams.get("departmentId");
    const status = searchParams.get("status") || "active";

    const query: Record<string, unknown> = {};

    if (departmentId) {
      query.departmentId = departmentId;
    }

    if (status && ["active", "inactive"].includes(status)) {
      query.status = status;
    }

    const designations = await Designation.find(query)
      .populate("departmentId", "name code")
      .sort({ name: 1 })
      .lean();

    // Get employee count for each designation
    const designationsWithCounts = await Promise.all(
      designations.map(async (designation) => {
        const employeeCount = await Employee.countDocuments({
          designationId: designation._id,
          status: "active",
        });

        return {
          id: designation._id.toString(),
          name: designation.name,
          description: designation.description || "",
          status: designation.status,
          employeeCount,
          department: designation.departmentId
            ? {
                id: (
                  designation.departmentId as unknown as { _id: { toString(): string } }
                )._id.toString(),
                name: (designation.departmentId as unknown as { name: string }).name,
                code: (designation.departmentId as unknown as { code: string }).code,
              }
            : null,
          createdAt: designation.createdAt.toISOString(),
          updatedAt: designation.updatedAt.toISOString(),
        };
      }),
    );

    return NextResponse.json({ designations: designationsWithCounts });
  } catch (error) {
    console.error("[GET /api/designations]", error);
    return NextResponse.json(
      { error: "Failed to fetch designations" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getVerifiedSession();
  if (!session || !["admin", "hr"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await connectDB();

    const body = await req.json();
    const { name, departmentId, description, status } = body;

    // Validation
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Designation name is required" },
        { status: 400 },
      );
    }

    if (!departmentId) {
      return NextResponse.json(
        { error: "Department is required" },
        { status: 400 },
      );
    }

    // Verify department exists
    const department = await Department.findById(departmentId);
    if (!department) {
      return NextResponse.json(
        { error: "Invalid department" },
        { status: 400 },
      );
    }

    // Check for duplicate designation name in same department
    const existing = await Designation.findOne({
      departmentId,
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });

    if (existing) {
      return NextResponse.json(
        {
          error:
            "A designation with this name already exists in this department",
        },
        { status: 400 },
      );
    }

    // Create designation
    const designation = await Designation.create({
      name: name.trim(),
      departmentId,
      description: description?.trim() || "",
      status: status || "active",
    });

    return NextResponse.json(
      {
        message: "Designation created successfully",
        designation: {
          id: designation._id.toString(),
          name: designation.name,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/designations]", error);
    return NextResponse.json(
      { error: "Failed to create designation" },
      { status: 500 },
    );
  }
}
