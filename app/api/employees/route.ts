/**
 * GET /api/employees - List employees with pagination, search, and filters
 * POST /api/employees - Create a new employee (admin/hr only)
 */

import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { getVerifiedSession } from "@/lib/dal";
import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import Department from "@/lib/models/Department";
import Designation from "@/lib/models/Designation";

export async function GET(req: NextRequest) {
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // Employees can only see their own data
  const canViewAll = ["admin", "hr"].includes(session.role);

  try {
    await connectDB();

    const { searchParams } = req.nextUrl;
    const page = Math.max(parseInt(searchParams.get("page") ?? "1"), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? "20"), 1),
      100,
    );
    const search = searchParams.get("search")?.trim() || "";
    const departmentId = searchParams.get("departmentId") || "";
    const designationId = searchParams.get("designationId") || "";
    const employmentType = searchParams.get("employmentType") || "";
    const status = searchParams.get("status") || "";
    const sortBy = searchParams.get("sortBy") || "firstName";
    const sortOrder = searchParams.get("sortOrder") === "desc" ? -1 : 1;

    // Build query
    const query: Record<string, unknown> = {};

    // If employee role, restrict to own record
    if (!canViewAll) {
      const empRecord = await Employee.findOne({ userId: session.userId });
      if (!empRecord) {
        return NextResponse.json(
          { error: "Employee record not found" },
          { status: 404 },
        );
      }
      query._id = empRecord._id;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
      ];
    }

    if (departmentId) query.departmentId = departmentId;
    if (designationId) query.designationId = designationId;
    if (employmentType) query.employmentType = employmentType;
    if (status) query.status = status;

    // Count total
    const total = await Employee.countDocuments(query);

    // Fetch employees
    const employees = await Employee.find(query)
      .sort({ [sortBy]: sortOrder })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate("departmentId", "name code")
      .populate("designationId", "name")
      .populate("managerId", "firstName lastName employeeId")
      .lean();

    const employeesData = employees.map((emp) => ({
      id: emp._id.toString(),
      employeeId: emp.employeeId,
      firstName: emp.firstName,
      lastName: emp.lastName,
      fullName: `${emp.firstName} ${emp.lastName}`,
      email: emp.email,
      phone: emp.phone || "",
      profilePhoto: emp.profilePhoto || "",
      department: emp.departmentId
        ? {
            id: (emp.departmentId as unknown as { _id: { toString(): string } })._id.toString(),
            name: (emp.departmentId as unknown as { name: string }).name,
            code: (emp.departmentId as unknown as { code: string }).code,
          }
        : null,
      designation: emp.designationId
        ? {
            id: (emp.designationId as unknown as { _id: { toString(): string } })._id.toString(),
            name: (emp.designationId as unknown as { name: string }).name,
          }
        : null,
      manager: emp.managerId
        ? {
            id: (emp.managerId as unknown as { _id: { toString(): string } })._id.toString(),
            name: `${(emp.managerId as unknown as { firstName: string }).firstName} ${(emp.managerId as unknown as { lastName: string }).lastName}`,
            employeeId: (emp.managerId as unknown as { employeeId: string }).employeeId,
          }
        : null,
      employmentType: emp.employmentType,
      joiningDate: emp.joiningDate.toISOString(),
      status: emp.status,
      createdAt: emp.createdAt.toISOString(),
      updatedAt: emp.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      employees: employeesData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/employees]", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
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
    const {
      employeeId,
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
      workLocation,
      notes,
    } = body;

    // Validation
    if (!employeeId?.trim()) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 },
      );
    }

    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 },
      );
    }

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!departmentId || !designationId) {
      return NextResponse.json(
        { error: "Department and designation are required" },
        { status: 400 },
      );
    }

    if (!joiningDate) {
      return NextResponse.json(
        { error: "Joining date is required" },
        { status: 400 },
      );
    }

    // Check for duplicate employee ID
    const existingEmpId = await Employee.findOne({
      employeeId: employeeId.trim().toUpperCase(),
    });
    if (existingEmpId) {
      return NextResponse.json(
        { error: "Employee ID already exists" },
        { status: 400 },
      );
    }

    // Check for duplicate email
    const existingEmail = await Employee.findOne({
      email: email.trim().toLowerCase(),
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already exists" },
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

    // Verify designation exists and belongs to department
    const designation = await Designation.findById(designationId);
    if (!designation) {
      return NextResponse.json(
        { error: "Invalid designation" },
        { status: 400 },
      );
    }

    if (designation.departmentId.toString() !== departmentId) {
      return NextResponse.json(
        { error: "Designation does not belong to the selected department" },
        { status: 400 },
      );
    }

    // Verify manager if provided
    if (managerId) {
      const manager = await Employee.findById(managerId);
      if (!manager) {
        return NextResponse.json({ error: "Invalid manager" }, { status: 400 });
      }
    }

    // Create employee
    const employee = await Employee.create({
      employeeId: employeeId.trim().toUpperCase(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || undefined,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender: gender || undefined,
      address: address?.trim() || undefined,
      emergencyContact: emergencyContact || undefined,
      departmentId,
      designationId,
      managerId: managerId || undefined,
      employmentType: employmentType || "full-time",
      joiningDate: new Date(joiningDate),
      status: "active",
      workLocation: workLocation?.trim() || undefined,
      notes: notes?.trim() || undefined,
    });

    await logAudit({
      session,
      req,
      action: "employee.create",
      entity: "Employee",
      entityId: employee._id.toString(),
      summary: `Employee ${employee.firstName} ${employee.lastName} (${employee.employeeId}) created`,
    });

    return NextResponse.json(
      {
        message: "Employee created successfully",
        employee: {
          id: employee._id.toString(),
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/employees]", error);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 },
    );
  }
}
