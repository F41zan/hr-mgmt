"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profilePhoto?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  departmentId?: {
    _id: string;
    name: string;
    code?: string;
  };
  designationId?: {
    _id: string;
    name: string;
  };
  managerId?: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  employmentType: string;
  joiningDate: string;
  employmentStatus: string;
  workLocation?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface EmployeeDetailViewProps {
  employeeId: string;
}

export default function EmployeeDetailView({
  employeeId,
}: EmployeeDetailViewProps) {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchEmployee();
  }, [employeeId]);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/employees/${employeeId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError("Employee not found");
          return;
        }
        throw new Error("Failed to fetch employee");
      }

      const data = await response.json();
      setEmployee(data.employee);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employee");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!employee) return;

    const confirmed = confirm(
      `Are you sure you want to deactivate ${employee.firstName} ${employee.lastName}? This will change their employment status to Inactive.`,
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/employees/${employee._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employmentStatus: "Inactive" }),
      });

      if (!response.ok) throw new Error("Failed to deactivate employee");

      alert("Employee deactivated successfully");
      fetchEmployee();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to deactivate employee",
      );
    }
  };

  const handleReactivate = async () => {
    if (!employee) return;

    const confirmed = confirm(
      `Are you sure you want to reactivate ${employee.firstName} ${employee.lastName}?`,
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/employees/${employee._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employmentStatus: "Active" }),
      });

      if (!response.ok) throw new Error("Failed to reactivate employee");

      alert("Employee reactivated successfully");
      fetchEmployee();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to reactivate employee",
      );
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center space-x-6">
              <div className="w-32 h-32 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-3">
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                <div className="h-5 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              {error || "Employee Not Found"}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              The employee you're looking for doesn't exist or you don't have
              permission to view it.
            </p>
            <button
              onClick={() => router.push("/employees")}
              className="mt-6 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Back to Employees
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {/* Profile Section */}
          <div className="flex items-center space-x-6">
            <div className="relative w-32 h-32 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center overflow-hidden">
              {employee.profilePhoto ? (
                <Image
                  src={employee.profilePhoto}
                  alt={`${employee.firstName} ${employee.lastName}`}
                  fill
                  className="object-cover"
                />
              ) : (
                <span className="text-4xl font-bold text-primary">
                  {employee.firstName[0]}
                  {employee.lastName[0]}
                </span>
              )}
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {employee.firstName} {employee.lastName}
              </h1>
              <p className="text-lg text-gray-600 mt-1">
                {employee.designationId?.name || "No Designation"}
              </p>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-sm text-gray-500">
                  ID: {employee.employeeId}
                </span>
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    employee.employmentStatus === "Active"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {employee.employmentStatus}
                </span>
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                  {employee.employmentType}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => router.push(`/employees?edit=${employee._id}`)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
            >
              Edit Employee
            </button>
            {employee.employmentStatus === "Active" ? (
              <button
                onClick={handleDeactivate}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                Deactivate
              </button>
            ) : (
              <button
                onClick={handleReactivate}
                className="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
              >
                Reactivate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Information Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Contact Information
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{employee.email}</dd>
            </div>
            {employee.phone && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">{employee.phone}</dd>
              </div>
            )}
            {employee.address && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {employee.address}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Employment Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Employment Details
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Department</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {employee.departmentId?.name || "Not Assigned"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Designation</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {employee.designationId?.name || "Not Assigned"}
              </dd>
            </div>
            {employee.managerId && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Reporting Manager
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {employee.managerId.firstName} {employee.managerId.lastName} (
                  {employee.managerId.employeeId})
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Joining Date
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(employee.joiningDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </dd>
            </div>
            {employee.workLocation && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Work Location
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {employee.workLocation}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Personal Information */}
        {(employee.dateOfBirth || employee.gender) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Personal Information
            </h2>
            <dl className="space-y-3">
              {employee.dateOfBirth && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Date of Birth
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(employee.dateOfBirth).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </dd>
                </div>
              )}
              {employee.gender && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Gender</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {employee.gender}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Emergency Contact */}
        {employee.emergencyContact && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              Emergency Contact
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {employee.emergencyContact.name}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {employee.emergencyContact.phone}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Relationship
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {employee.emergencyContact.relationship}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      {/* Notes Section */}
      {employee.notes && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Notes
          </h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {employee.notes}
          </p>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-6 text-xs text-gray-500">
          <div>
            <span className="font-medium">Created:</span>{" "}
            {new Date(employee.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div>
            <span className="font-medium">Last Updated:</span>{" "}
            {new Date(employee.updatedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
