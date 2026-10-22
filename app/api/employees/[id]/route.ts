/**
 * GET /api/employees/[id] - Get employee details
 * PATCH /api/employees/[id] - Update employee
 * DELETE /api/employees/[id] - Deactivate employee
 */

import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { getVerifiedSession } from "@/lib/dal";
import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import Department from "@/lib/models/Department";
import Designation from "@/lib/models/Designation";
import User from "@/lib/models/User";
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
        { error: "Invalid employee ID" },
        { status: 400 },
      );
    }

    const employee = await Employee.findById(id)
      .populate("departmentId", "name code")
      .populate("designationId", "name description")
      .populate("managerId", "firstName lastName employeeId email")
      .lean();

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    // Check authorization - employees can only view their own record
    const canViewAll = ["admin", "hr"].includes(session.role);
    if (!canViewAll) {
      const ownRecord = await Employee.findOne({ userId: session.userId });
      if (!ownRecord || ownRecord._id.toString() !== id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({
      employee: {
        id: employee._id.toString(),
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        fullName: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        phone: employee.phone || "",
        profilePhoto: employee.profilePhoto || "",
        dateOfBirth: employee.dateOfBirth
          ? employee.dateOfBirth.toISOString()
          : null,
        gender: employee.gender || "",
        address: employee.address || "",
        emergencyContact: employee.emergencyContact || null,
        department: employee.departmentId
          ? {
              id: (employee.departmentId as unknown as { _id: { toString(): string } })._id.toString(),
              name: (employee.departmentId as unknown as { name: string }).name,
              code: (employee.departmentId as unknown as { code: string }).code,
            }
          : null,
        designation: employee.designationId
          ? {
              id: (employee.designationId as unknown as { _id: { toString(): string } })._id.toString(),
              name: (employee.designationId as unknown as { name: string }).name,
              description:
                (employee.designationId as unknown as { description?: string })
                  .description || "",
            }
          : null,
        manager: employee.managerId
          ? {
              id: (employee.managerId as unknown as { _id: { toString(): string } })._id.toString(),
              name: `${(employee.managerId as unknown as { firstName: string }).firstName} ${(employee.managerId as unknown as { lastName: string }).lastName}`,
              employeeId: (employee.managerId as unknown as { employeeId: string })
                .employeeId,
              email: (employee.managerId as unknown as { email: string }).email,
            }
          : null,
        employmentType: employee.employmentType,
        joiningDate: employee.joiningDate.toISOString(),
        status: employee.status,
        workLocation: employee.workLocation || "",
        notes: canViewAll ? employee.notes || "" : "", // Notes only for admin/hr
        createdAt: employee.createdAt.toISOString(),
        updatedAt: employee.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[GET /api/employees/[id]]", error);
    return NextResponse.json(
      { error: "Failed to fetch employee" },
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
        { error: "Invalid employee ID" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      emergencyContact,
      departmentId,
      designationId,
      managerId,
      employmentType,
      joiningDate,
      status,
      workLocation,
      notes,
    } = body;

    const employee = await Employee.findById(id);
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    // Check for duplicate email (excluding current)
    if (email && email.toLowerCase() !== employee.email) {
      const existingEmail = await Employee.findOne({
        email: email.trim().toLowerCase(),
        _id: { $ne: id },
      });
      if (existingEmail) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 400 },
        );
      }
    }

    // Verify department if changing
    if (departmentId && departmentId !== employee.departmentId.toString()) {
      const department = await Department.findById(departmentId);
      if (!department) {
        return NextResponse.json(
          { error: "Invalid department" },
          { status: 400 },
        );
      }
    }

    // Verify designation if changing
    if (designationId && designationId !== employee.designationId.toString()) {
      const designation = await Designation.findById(designationId);
      if (!designation) {
        return NextResponse.json(
          { error: "Invalid designation" },
          { status: 400 },
        );
      }

      // Ensure designation belongs to the (possibly new) department
      const targetDeptId = departmentId || employee.departmentId.toString();
      if (designation.departmentId.toString() !== targetDeptId) {
        return NextResponse.json(
          { error: "Designation does not belong to the selected department" },
          { status: 400 },
        );
      }
    }

    // Verify manager if changing
    if (managerId !== undefined) {
      if (managerId) {
        // Prevent self-assignment
        if (managerId === id) {
          return NextResponse.json(
            { error: "Employee cannot be their own manager" },
            { status: 400 },
          );
        }

        const manager = await Employee.findById(managerId);
        if (!manager) {
          return NextResponse.json(
            { error: "Invalid manager" },
            { status: 400 },
          );
        }

        // Prevent circular reporting (simple check - manager cannot report to this employee)
        if (manager.managerId?.toString() === id) {
          return NextResponse.json(
            { error: "Circular reporting relationship detected" },
            { status: 400 },
          );
        }
      }
    }

    // Update allowed fields
    if (firstName) employee.firstName = firstName.trim();
    if (lastName) employee.lastName = lastName.trim();
    if (email) employee.email = email.trim().toLowerCase();
    if (phone !== undefined) employee.phone = phone?.trim() || undefined;
    if (dateOfBirth !== undefined)
      employee.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined;
    if (gender !== undefined) employee.gender = gender || undefined;
    if (address !== undefined) employee.address = address?.trim() || undefined;
    if (emergencyContact !== undefined)
      employee.emergencyContact = emergencyContact || undefined;
    if (departmentId)
      employee.departmentId = new mongoose.Types.ObjectId(departmentId);
    if (designationId)
      employee.designationId = new mongoose.Types.ObjectId(designationId);
    if (managerId !== undefined)
      employee.managerId = managerId
        ? new mongoose.Types.ObjectId(managerId)
        : undefined;
    if (employmentType) employee.employmentType = employmentType;
    if (joiningDate) employee.joiningDate = new Date(joiningDate);
    if (status) employee.status = status;
    if (workLocation !== undefined)
      employee.workLocation = workLocation?.trim() || undefined;
    if (notes !== undefined) employee.notes = notes?.trim() || undefined;

    await employee.save();

    // If status changed to inactive/terminated, also deactivate the user account
    if (status && ["inactive", "terminated"].includes(status)) {
      if (employee.userId) {
        await User.findByIdAndUpdate(employee.userId, { isActive: false });
      }
    }

    await logAudit({
      session,
      req,
      action: "employee.update",
      entity: "Employee",
      entityId: employee._id.toString(),
      summary: `Employee ${employee.firstName} ${employee.lastName} (${employee.employeeId}) updated`,
      details: status ? { status } : undefined,
    });

    return NextResponse.json({
      message: "Employee updated successfully",
      employee: {
        id: employee._id.toString(),
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
      },
    });
  } catch (error) {
    console.error("[PATCH /api/employees/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update employee" },
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
        { error: "Invalid employee ID" },
        { status: 400 },
      );
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    // Check if employee is a manager
    const subordinateCount = await Employee.countDocuments({
      managerId: id,
      status: "active",
    });

    if (subordinateCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot deactivate employee who manages ${subordinateCount} active employee(s). Please reassign subordinates first.`,
        },
        { status: 400 },
      );
    }

    // Deactivate instead of delete
    employee.status = "inactive";
    await employee.save();

    // Also deactivate the user account if linked
    if (employee.userId) {
      await User.findByIdAndUpdate(employee.userId, { isActive: false });
    }

    await logAudit({
      session,
      req,
      action: "employee.deactivate",
      entity: "Employee",
      entityId: employee._id.toString(),
      summary: `Employee ${employee.firstName} ${employee.lastName} (${employee.employeeId}) deactivated`,
    });

    return NextResponse.json({
      message: "Employee deactivated successfully",
    });
  } catch (error) {
    console.error("[DELETE /api/employees/[id]]", error);
    return NextResponse.json(
      { error: "Failed to deactivate employee" },
      { status: 500 },
    );
  }
}
