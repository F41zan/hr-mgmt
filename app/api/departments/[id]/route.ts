/**
 * GET /api/departments/[id] - Get department details
 * PATCH /api/departments/[id] - Update department
 * DELETE /api/departments/[id] - Deactivate department
 */

import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/lib/dal";
import { connectDB } from "@/lib/db";
import Department from "@/lib/models/Department";
import Employee from "@/lib/models/Employee";
import Designation from "@/lib/models/Designation";
import mongoose from "mongoose";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid department ID" },
        { status: 400 },
      );
    }

    const department = await Department.findById(id)
      .populate("headEmployeeId", "firstName lastName employeeId email")
      .lean();

    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 },
      );
    }

    // Get counts
    const [activeEmployees, inactiveEmployees, designations] =
      await Promise.all([
        Employee.countDocuments({
          departmentId: department._id,
          status: "active",
        }),
        Employee.countDocuments({
          departmentId: department._id,
          status: { $ne: "active" },
        }),
        Designation.find({ departmentId: department._id }).lean(),
      ]);

    // Get employees for this department
    const employees = await Employee.find({
      departmentId: department._id,
      status: "active",
    })
      .select("firstName lastName employeeId email designationId")
      .populate("designationId", "name")
      .limit(50)
      .lean();

    return NextResponse.json({
      department: {
        id: department._id.toString(),
        name: department.name,
        code: department.code,
        description: department.description || "",
        status: department.status,
        headEmployee: department.headEmployeeId
          ? {
              id: (
                department.headEmployeeId as { _id: unknown }
              )._id.toString(),
              name: `${(department.headEmployeeId as { firstName: string }).firstName} ${(department.headEmployeeId as { lastName: string }).lastName}`,
              employeeId: (department.headEmployeeId as { employeeId: string })
                .employeeId,
              email: (department.headEmployeeId as { email: string }).email,
            }
          : null,
        createdAt: department.createdAt.toISOString(),
        updatedAt: department.updatedAt.toISOString(),
      },
      stats: {
        activeEmployees,
        inactiveEmployees,
        totalDesignations: designations.length,
      },
      designations: designations.map((d) => ({
        id: d._id.toString(),
        name: d.name,
        status: d.status,
      })),
      employees: employees.map((e) => ({
        id: e._id.toString(),
        name: `${e.firstName} ${e.lastName}`,
        employeeId: e.employeeId,
        email: e.email,
        designation: e.designationId
          ? (e.designationId as { name: string }).name
          : "N/A",
      })),
    });
  } catch (error) {
    console.error("[GET /api/departments/[id]]", error);
    return NextResponse.json(
      { error: "Failed to fetch department" },
      { status: 500 },
    );
  }
}

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
        { error: "Invalid department ID" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { name, code, description, headEmployeeId, status } = body;

    const department = await Department.findById(id);
    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 },
      );
    }

    // Check for duplicate code (excluding current)
    if (code && code !== department.code) {
      const existing = await Department.findOne({
        code: code.trim().toUpperCase(),
        _id: { $ne: id },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Department code already exists" },
          { status: 400 },
        );
      }
    }

    // Validate head employee if provided
    if (headEmployeeId) {
      const employee = await Employee.findById(headEmployeeId);
      if (!employee) {
        return NextResponse.json(
          { error: "Invalid department head" },
          { status: 400 },
        );
      }
    }

    // Update allowed fields
    if (name) department.name = name.trim();
    if (code) department.code = code.trim().toUpperCase();
    if (description !== undefined) department.description = description?.trim();
    if (headEmployeeId !== undefined)
      department.headEmployeeId = headEmployeeId || undefined;
    if (status) department.status = status;

    await department.save();

    return NextResponse.json({
      message: "Department updated successfully",
      department: {
        id: department._id.toString(),
        name: department.name,
        code: department.code,
      },
    });
  } catch (error) {
    console.error("[PATCH /api/departments/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update department" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getVerifiedSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid department ID" },
        { status: 400 },
      );
    }

    const department = await Department.findById(id);
    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 },
      );
    }

    // Check for active employees
    const activeEmployeeCount = await Employee.countDocuments({
      departmentId: id,
      status: "active",
    });

    if (activeEmployeeCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot deactivate department with ${activeEmployeeCount} active employee(s). Please reassign or deactivate employees first.`,
        },
        { status: 400 },
      );
    }

    // Deactivate instead of delete
    department.status = "inactive";
    await department.save();

    return NextResponse.json({
      message: "Department deactivated successfully",
    });
  } catch (error) {
    console.error("[DELETE /api/departments/[id]]", error);
    return NextResponse.json(
      { error: "Failed to deactivate department" },
      { status: 500 },
    );
  }
}
