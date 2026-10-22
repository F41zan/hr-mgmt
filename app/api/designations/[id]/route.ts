/**
 * PATCH /api/designations/[id] - Update designation
 * DELETE /api/designations/[id] - Deactivate designation
 */

import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/lib/dal";
import { connectDB } from "@/lib/db";
import Designation from "@/lib/models/Designation";
import Department from "@/lib/models/Department";
import Employee from "@/lib/models/Employee";
import mongoose from "mongoose";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getVerifiedSession();
  if (!session || !["admin", "hr"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid designation ID" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { name, departmentId, description, status } = body;

    const designation = await Designation.findById(id);
    if (!designation) {
      return NextResponse.json(
        { error: "Designation not found" },
        { status: 404 },
      );
    }

    // Verify department if changing
    if (departmentId && departmentId !== designation.departmentId.toString()) {
      const department = await Department.findById(departmentId);
      if (!department) {
        return NextResponse.json(
          { error: "Invalid department" },
          { status: 400 },
        );
      }
    }

    // Check for duplicate name in department
    if (name) {
      const targetDeptId = departmentId || designation.departmentId;
      const existing = await Designation.findOne({
        departmentId: targetDeptId,
        name: { $regex: `^${name.trim()}$`, $options: "i" },
        _id: { $ne: id },
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
    }

    // Update allowed fields
    if (name) designation.name = name.trim();
    if (departmentId)
      designation.departmentId = new mongoose.Types.ObjectId(departmentId);
    if (description !== undefined)
      designation.description = description?.trim();
    if (status) designation.status = status;

    await designation.save();

    return NextResponse.json({
      message: "Designation updated successfully",
      designation: {
        id: designation._id.toString(),
        name: designation.name,
      },
    });
  } catch (error) {
    console.error("[PATCH /api/designations/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update designation" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getVerifiedSession();
  if (!session || !["admin", "hr"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid designation ID" },
        { status: 400 },
      );
    }

    const designation = await Designation.findById(id);
    if (!designation) {
      return NextResponse.json(
        { error: "Designation not found" },
        { status: 404 },
      );
    }

    // Check for active employees
    const activeEmployeeCount = await Employee.countDocuments({
      designationId: id,
      status: "active",
    });

    if (activeEmployeeCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot deactivate designation with ${activeEmployeeCount} active employee(s). Please reassign employees first.`,
        },
        { status: 400 },
      );
    }

    // Deactivate instead of delete
    designation.status = "inactive";
    await designation.save();

    return NextResponse.json({
      message: "Designation deactivated successfully",
    });
  } catch (error) {
    console.error("[DELETE /api/designations/[id]]", error);
    return NextResponse.json(
      { error: "Failed to deactivate designation" },
      { status: 500 },
    );
  }
}
