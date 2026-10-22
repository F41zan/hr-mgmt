"use client";

import { useState, useEffect } from "react";
import type { VerifiedSession } from "@/lib/dal";
import AddDepartmentModal from "./AddDepartmentModal";
import EditDepartmentModal from "./EditDepartmentModal";
import AddDesignationModal from "./AddDesignationModal";

interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  status: string;
  employeeCount: number;
  designationCount: number;
  headEmployee: {
    id: string;
    name: string;
    employeeId: string;
  } | null;
  createdAt: string;
}

export default function DepartmentList({
  session,
}: {
  session: VerifiedSession;
}) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [addingDesignationFor, setAddingDesignationFor] =
    useState<Department | null>(null);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        sortBy: "name",
      });
      const res = await fetch(`/api/departments?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setDepartments(data.departments);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDepartments();
  }, [search, statusFilter]);

  const handleDeactivate = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to deactivate "${name}"? This will prevent new assignments.`,
      )
    )
      return;

    try {
      const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to deactivate");
      }
      alert("Department deactivated successfully");
      void fetchDepartments();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  if (loading)
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
          onClick={fetchDepartments}
        >
          Retry
        </button>
      </div>
    );

  return (
    <>
      <div className="stat-card">
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search departments..."
            className="form-input flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-input sm:w-40"
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
            + Add Department
          </button>
        </div>

        {/* Table */}
        {departments.length === 0 ? (
          <div className="text-center py-10 text-[var(--color-text-secondary)]">
            No departments found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-primary-light)] text-left">
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">
                    Code
                  </th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">
                    Name
                  </th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">
                    Head
                  </th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)] text-center">
                    Employees
                  </th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)] text-center">
                    Designations
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
                {departments.map((dept) => (
                  <tr
                    key={dept.id}
                    className="hover:bg-[var(--color-primary-light)] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-[var(--color-primary)]">
                      {dept.code}
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--color-text)]">
                      {dept.name}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {dept.headEmployee?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">
                      {dept.employeeCount}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">
                      {dept.designationCount}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                          dept.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {dept.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingDept(dept)}
                          className="text-[var(--color-primary)] hover:underline text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setAddingDesignationFor(dept)}
                          className="text-[var(--color-primary)] hover:underline text-sm font-medium"
                        >
                          Designations
                        </button>
                        {dept.status === "active" && (
                          <button
                            onClick={() => handleDeactivate(dept.id, dept.name)}
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
      </div>

      {showAddModal && (
        <AddDepartmentModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            void fetchDepartments();
          }}
        />
      )}

      {editingDept && (
        <EditDepartmentModal
          department={editingDept}
          onClose={() => setEditingDept(null)}
          onSuccess={() => {
            setEditingDept(null);
            void fetchDepartments();
          }}
        />
      )}

      {addingDesignationFor && (
        <AddDesignationModal
          department={addingDesignationFor}
          onClose={() => setAddingDesignationFor(null)}
          onSuccess={() => {
            setAddingDesignationFor(null);
            void fetchDepartments();
          }}
        />
      )}
    </>
  );
}
