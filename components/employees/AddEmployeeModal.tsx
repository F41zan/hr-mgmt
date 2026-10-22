"use client";

import { useState, useEffect } from "react";

interface Department {
  id: string;
  name: string;
}

interface Designation {
  id: string;
  name: string;
}

interface Props {
  departments: Department[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddEmployeeModal({
  departments,
  onClose,
  onSuccess,
}: Props) {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    employeeId: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    departmentId: "",
    designationId: "",
    employmentType: "full-time",
    joiningDate: new Date().toISOString().split("T")[0],
  });

  const handleDepartmentChange = async (deptId: string) => {
    setFormData({ ...formData, departmentId: deptId, designationId: "" });

    if (!deptId) {
      setDesignations([]);
      return;
    }

    try {
      const res = await fetch(`/api/designations?departmentId=${deptId}`);
      const data = await res.json();
      setDesignations(data.designations || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create employee");

      alert("Employee created successfully!");
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-4">
            Add New Employee
          </h2>

          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Employee ID *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.employeeId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      employeeId: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="EMP001"
                  required
                />
              </div>

              <div>
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="form-label">Joining Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.joiningDate}
                  onChange={(e) =>
                    setFormData({ ...formData, joiningDate: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="form-label">Department *</label>
                <select
                  className="form-input"
                  value={formData.departmentId}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Designation *</label>
                <select
                  className="form-input"
                  value={formData.designationId}
                  onChange={(e) =>
                    setFormData({ ...formData, designationId: e.target.value })
                  }
                  required
                  disabled={!formData.departmentId}
                >
                  <option value="">
                    {formData.departmentId
                      ? "Select Designation"
                      : "Select Department First"}
                  </option>
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Employment Type *</label>
                <select
                  className="form-input"
                  value={formData.employmentType}
                  onChange={(e) =>
                    setFormData({ ...formData, employmentType: e.target.value })
                  }
                >
                  <option value="full-time">Full Time</option>
                  <option value="part-time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="intern">Intern</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Creating..." : "Create Employee"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
