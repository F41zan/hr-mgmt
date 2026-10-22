"use client";

import { useEffect, useState, useCallback } from "react";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import CreateUserModal from "@/components/admin/CreateUserModal";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
}

export default function AdminUserTable() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users");
      const data = (await res.json()) as { users?: UserRow[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to load users.");
        return;
      }
      setUsers(data.users ?? []);
    } catch {
      setError("Network error. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  async function toggleActive(id: string, current: boolean) {
    setActionError("");
    setActionSuccess("");
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    const data = (await res.json()) as { user?: UserRow; error?: string };
    if (!res.ok) {
      setActionError(data.error ?? "Update failed.");
      return;
    }
    setActionSuccess(`Account ${!current ? "activated" : "deactivated"}.`);
    void fetchUsers();
  }

  async function changeRole(id: string, newRole: string) {
    setActionError("");
    setActionSuccess("");
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    const data = (await res.json()) as { user?: UserRow; error?: string };
    if (!res.ok) {
      setActionError(data.error ?? "Role update failed.");
      return;
    }
    setActionSuccess("Role updated.");
    void fetchUsers();
  }

  const roleBadge: Record<string, string> = {
    admin: "bg-purple-100 text-purple-700",
    hr: "bg-blue-100 text-blue-700",
    employee: "bg-green-100 text-green-700",
  };

  return (
    <div className="stat-card p-0 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-primary-border)]">
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">
          {users.length} account{users.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary w-auto px-4 py-2 text-sm"
        >
          + Create account
        </button>
      </div>

      {/* Feedback */}
      {actionError && (
        <div className="px-5 pt-3">
          <Alert variant="error" message={actionError} />
        </div>
      )}
      {actionSuccess && (
        <div className="px-5 pt-3">
          <Alert variant="success" message={actionSuccess} />
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner label="Loading users…" />
        </div>
      ) : error ? (
        <div className="px-5 py-6">
          <Alert variant="error" message={error} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-primary-light)] text-[var(--color-text-secondary)] text-left">
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Last Login</th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-primary-border)]">
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-[var(--color-primary-light)] transition-colors"
                >
                  <td className="px-5 py-3 font-medium text-[var(--color-text)]">
                    {u.name}
                  </td>
                  <td className="px-5 py-3 text-[var(--color-text-secondary)]">
                    {u.email}
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => void changeRole(u.id, e.target.value)}
                      className="form-input py-1 px-2 text-xs w-28"
                      aria-label={`Change role for ${u.name}`}
                    >
                      <option value="hr">HR</option>
                      <option value="employee">Employee</option>
                    </select>
                    <span
                      className={`ml-2 hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${roleBadge[u.role] ?? ""}`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                    >
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[var(--color-text-secondary)]">
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleString()
                      : "Never"}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => void toggleActive(u.id, u.isActive)}
                      className={`text-xs font-semibold px-3 py-1 rounded-md border transition-colors ${
                        u.isActive
                          ? "border-red-200 text-red-600 hover:bg-red-50"
                          : "border-green-200 text-green-600 hover:bg-green-50"
                      }`}
                      aria-label={
                        u.isActive
                          ? `Deactivate ${u.name}`
                          : `Activate ${u.name}`
                      }
                    >
                      {u.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="text-center py-8 text-[var(--color-text-secondary)]">
              No users found.
            </p>
          )}
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            void fetchUsers();
          }}
        />
      )}
    </div>
  );
}
