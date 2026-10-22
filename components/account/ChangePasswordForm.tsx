"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import PasswordField from "@/components/ui/PasswordField";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";

export default function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!currentPassword)
      errs.currentPassword = "Current password is required.";
    if (!newPassword) errs.newPassword = "New password is required.";
    else if (newPassword.length < 8)
      errs.newPassword = "Password must be at least 8 characters.";
    else if (!/[A-Z]/.test(newPassword))
      errs.newPassword = "Must contain an uppercase letter.";
    else if (!/[a-z]/.test(newPassword))
      errs.newPassword = "Must contain a lowercase letter.";
    else if (!/\d/.test(newPassword))
      errs.newPassword = "Must contain a number.";
    if (!confirmPassword)
      errs.confirmPassword = "Please confirm your new password.";
    else if (newPassword !== confirmPassword)
      errs.confirmPassword = "Passwords do not match.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setServerError(data.error ?? "Failed to change password.");
        return;
      }
      setSuccess(true);
      // Session is destroyed server-side — redirect to login after brief delay
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col gap-4">
        <Alert
          variant="success"
          message="Password changed successfully. Redirecting to sign in…"
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {serverError && <Alert variant="error" message={serverError} />}

      <PasswordField
        id="currentPassword"
        label="Current password"
        autoComplete="current-password"
        placeholder="Your current password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        error={errors.currentPassword}
        disabled={loading}
      />

      <PasswordField
        id="newPassword"
        label="New password"
        autoComplete="new-password"
        placeholder="Min 8 characters"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        error={errors.newPassword}
        disabled={loading}
      />

      {/* Password requirements hint */}
      <ul className="text-xs text-[var(--color-text-secondary)] list-disc list-inside -mt-2">
        <li>Minimum 8 characters</li>
        <li>At least one uppercase letter (A–Z)</li>
        <li>At least one lowercase letter (a–z)</li>
        <li>At least one number (0–9)</li>
      </ul>

      <PasswordField
        id="confirmPassword"
        label="Confirm new password"
        autoComplete="new-password"
        placeholder="Repeat your new password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={errors.confirmPassword}
        disabled={loading}
      />

      <div className="flex justify-end">
        <button
          type="submit"
          className="btn-primary w-auto px-6"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <Spinner /> Updating…
            </>
          ) : (
            "Update password"
          )}
        </button>
      </div>
    </form>
  );
}
