"use client";

import { useState, FormEvent } from "react";
import FormField from "@/components/ui/FormField";
import PasswordField from "@/components/ui/PasswordField";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateUserModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employee");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required.";
    if (!email.trim()) errs.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = "Invalid email.";
    if (!password) errs.password = "Password is required.";
    else if (password.length < 8) errs.password = "Min 8 characters.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, password }),
      });
      const data = (await res.json()) as { user?: unknown; error?: string };
      if (!res.ok) {
        setServerError(data.error ?? "Failed to create account.");
        return;
      }
      onCreated();
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.5)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="auth-card w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2
            id="modal-title"
            className="text-lg font-bold text-[var(--color-text)]"
          >
            Create account
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] text-xl leading-none focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] rounded"
          >
            ✕
          </button>
        </div>

        {serverError && (
          <Alert variant="error" message={serverError} className="mb-4" />
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
          <FormField
            id="new-name"
            label="Full name"
            type="text"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            disabled={loading}
          />
          <FormField
            id="new-email"
            label="Email address"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            disabled={loading}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="new-role" className="form-label">
              Role
            </label>
            <select
              id="new-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="form-input"
              disabled={loading}
            >
              <option value="employee">Employee</option>
              <option value="hr">HR</option>
            </select>
          </div>
          <PasswordField
            id="new-password"
            label="Initial password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            disabled={loading}
          />
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <Spinner /> Creating…
                </>
              ) : (
                "Create account"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
