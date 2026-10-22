/**
 * GET /api/departments - List departments with pagination, search, and filters
 * POST /api/departments - Create a new department (admin/hr only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/lib/dal";
import { connectDB } from "@/lib/db";
import Department from "@/lib/models/Department";
import Employee from "@/lib/models/Employee";
import Designation from "@/lib/models/Designation";

export async function GET(req: NextRequest) {
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    await connectDB();

    const { searchParams } = req.nextUrl;
    const page = Math.max(parseInt(searchParams.get("page") ?? "1"), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? "10"), 1),
      100,
    );
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "";
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") === "desc" ? -1 : 1;

    // Build query
    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    if (status && ["active", "inactive"].includes(status)) {
      query.status = status;
    }

    // Count total
    const total = await Department.countDocuments(query);

    // Fetch departments
    const departments = await Department.find(query)
      .sort({ [sortBy]: sortOrder })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate("headEmployeeId", "firstName lastName employeeId")
      .lean();

    // Get employee and designation counts for each department
    const departmentsWithCounts = await Promise.all(
      departments.map(async (dept) => {
        const [employeeCount, designationCount] = await Promise.all([
          Employee.countDocuments({
            departmentId: dept._id,
            status: "active",
          }),
          Designation.countDocuments({
            departmentId: dept._id,
            status: "active",
          }),
        ]);

        return {
          id: dept._id.toString(),
          name: dept.name,
          code: dept.code,
          description: dept.description || "",
          status: dept.status,
          employeeCount,
          designationCount,
          headEmployee: dept.headEmployeeId
            ? {
                id: (dept.headEmployeeId as unknown as { _id: { toString(): string } })._id.toString(),
                name: `${(dept.headEmployeeId as unknown as { firstName: string }).firstName} ${(dept.headEmployeeId as unknown as { lastName: string }).lastName}`,
                employeeId: (dept.headEmployeeId as unknown as { employeeId: string })
                  .employeeId,
              }
            : null,
          createdAt: dept.createdAt.toISOString(),
          updatedAt: dept.updatedAt.toISOString(),
        };
      }),
    );

    return NextResponse.json({
      departments: departmentsWithCounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/departments]", error);
    return NextResponse.json(
      { error: "Failed to fetch departments" },
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
    const { name, code, description, headEmployeeId, status } = body;

    // Validation
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Department name is required" },
        { status: 400 },
      );
    }

    if (!code?.trim()) {
      return NextResponse.json(
        { error: "Department code is required" },
        { status: 400 },
      );
    }

    // Check for duplicate code
    const existing = await Department.findOne({
      code: code.trim().toUpperCase(),
    });
    if (existing) {
      return NextResponse.json(
        { error: "Department code already exists" },
        { status: 400 },
      );
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

    // Create department
    const department = await Department.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description?.trim() || "",
      headEmployeeId: headEmployeeId || null,
      status: status || "active",
    });

    return NextResponse.json(
      {
        message: "Department created successfully",
        department: {
          id: department._id.toString(),
          name: department.name,
          code: department.code,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/departments]", error);
    return NextResponse.json(
      { error: "Failed to create department" },
      { status: 500 },
    );
  }
}
