"use client";

import { useState, useEffect } from "react";
import type { VerifiedSession } from "@/lib/dal";
import AddEmployeeModal from "./AddEmployeeModal";
import EditEmployeeModal from "./EditEmployeeModal";

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  department: { id: string; name: string; code: string } | null;
  designation: { id: string; name: string } | null;
  employmentType: string;
  joiningDate: string;
  status: string;
}

interface Department {
  id: string;
  name: string;
}

interface Designation {
  id: string;
  name: string;
}

export default function EmployeeList({
  session,
}: {
  session: VerifiedSession;
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  const limit = 20;

  const fetchEmployees = async (pageNum: number) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: limit.toString(),
        search,
        departmentId: departmentFilter,
        status: statusFilter,
      });
      const res = await fetch(`/api/employees?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setEmployees(data.employees);
      setTotal(data.pagination.total);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments?limit=1000&status=active");
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    void fetchDepartments();
  }, []);

  useEffect(() => {
    void fetchEmployees(1);
    setPage(1);
  }, [search, departmentFilter, statusFilter]);

  useEffect(() => {
    void fetchEmployees(page);
  }, [page]);

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate "${name}"?`)) return;

    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to deactivate");
      }
      alert("Employee deactivated successfully");
      void fetchEmployees(page);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const pages = Math.ceil(total / limit);

  if (loading && page === 1)
    return (
      <div className="stat-card flex justify-center items-center py-20">
        <div className="spinner" />
      </div>
    );

  if (error)
    return (
      <div className="stat-card text-center py-10">
        <p className="text-[var(--color-error)]">{error}</p>
        <button
          className="btn-primary w-auto px-6 mt-4"
          onClick={() => void fetchEmployees(page)}
        >
          Retry
        </button>
      </div>
    );

  return (
    <>
      <div className="stat-card">
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by name, email, ID..."
            className="form-input flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-input sm:w-40"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            className="form-input sm:w-32"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            className="btn-primary w-full sm:w-auto px-6"
            onClick={() => setShowAddModal(true)}
          >
            + Add Employee
          </button>
        </div>

        {/* Summary */}
        <div className="text-sm text-[var(--color-text-secondary)] mb-4">
          Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of{" "}
          {total} employees
        </div>

        {/* Table */}
        {employees.length === 0 ? (
          <div className="text-center py-10 text-[var(--color-text-secondary)]">
            No employees found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-primary-light)] text-left">
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">
                    ID
                  </th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">
                    Name
                  </th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">
                    Email
                  </th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">
                    Department
                  </th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">
                    Designation
                  </th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">
                    Type
                  </th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">
                    Status
                  </th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-primary-border)]">
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-[var(--color-primary-light)] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-[var(--color-primary)]">
                      {emp.employeeId}
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--color-text)]">
                      {emp.fullName}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {emp.email}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text)]">
                      {emp.department?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text)]">
                      {emp.designation?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="capitalize">
                        {emp.employmentType.replace("-", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                          emp.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingEmp(emp)}
                          className="text-[var(--color-primary)] hover:underline text-sm font-medium"
                        >
                          Edit
                        </button>
                        {emp.status === "active" && (
                          <button
                            onClick={() =>
                              handleDeactivate(emp.id, emp.fullName)
                            }
                            className="text-[var(--color-error)] hover:underline text-sm font-medium"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex justify-center gap-2 mt-6 pt-4 border-t border-[var(--color-primary-border)]">
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1 rounded ${
                  page === p
                    ? "bg-[var(--color-primary)] text-white"
                    : "border border-[var(--color-primary-border)] hover:bg-[var(--color-primary-light)]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddEmployeeModal
          departments={departments}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            void fetchEmployees(1);
            setPage(1);
          }}
        />
      )}

      {editingEmp && (
        <EditEmployeeModal
          employee={editingEmp}
          departments={departments}
          onClose={() => setEditingEmp(null)}
          onSuccess={() => {
            setEditingEmp(null);
            void fetchEmployees(page);
          }}
        />
      )}
    </>
  );
}
