"use client";

import { useState, useEffect } from "react";

interface Department {
  id: string;
  name: string;
}

interface Designation {
  id: string;
  name: string;
  status: string;
  employeeCount: number;
}

interface Props {
  department: Department;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddDesignationModal({
  department,
  onClose,
  onSuccess,
}: Props) {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [error, setError] = useState("");

  const fetchDesignations = async () => {
    try {
      const res = await fetch(
        `/api/designations?departmentId=${department.id}`,
      );
      const data = await res.json();
      setDesignations(data.designations);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    void fetchDesignations();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/designations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          departmentId: department.id,
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to create designation");

      alert("Designation created successfully!");
      setFormData({ name: "", description: "" });
      setShowForm(false);
      void fetchDesignations();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Deactivate "${name}"?`)) return;

    try {
      const res = await fetch(`/api/designations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      alert("Designation deactivated");
      void fetchDesignations();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">
            Manage Designations
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            Department: <span className="font-semibold">{department.name}</span>
          </p>

          {!showForm && (
            <button
              className="btn-primary w-full sm:w-auto mb-4"
              onClick={() => setShowForm(true)}
            >
              + Add Designation
            </button>
          )}

          {showForm && (
            <div className="mb-6 p-4 border border-[var(--color-primary-border)] rounded-lg">
              <h3 className="font-semibold mb-3">New Designation</h3>
              {error && (
                <div className="alert alert-error mb-3">
                  <span>{error}</span>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="form-label">Designation Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Creating..." : "Create"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowForm(false);
                      setError("");
                      setFormData({ name: "", description: "" });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="font-semibold">Existing Designations</h3>
            {designations.length === 0 ? (
              <p className="text-[var(--color-text-secondary)] text-sm py-4">
                No designations yet
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-primary-border)]">
                {designations.map((des) => (
                  <div
                    key={des.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="font-medium">{des.name}</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        {des.employeeCount} employee(s) · {des.status}
                      </p>
                    </div>
                    {des.status === "active" && des.employeeCount === 0 && (
                      <button
                        onClick={() => handleDeactivate(des.id, des.name)}
                        className="text-[var(--color-error)] text-sm hover:underline"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <button className="btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
