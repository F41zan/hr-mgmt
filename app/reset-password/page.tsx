"use client";

import { useState, FormEvent, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import PasswordField from "@/components/ui/PasswordField";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <Alert
        variant="error"
        message="Invalid reset link. Please request a new password reset."
      />
    );
  }

  function validate(): boolean {
    const errs: { password?: string; confirmPassword?: string } = {};
    if (!password) errs.password = "Password is required.";
    else if (password.length < 8)
      errs.password = "Password must be at least 8 characters.";
    if (!confirmPassword)
      errs.confirmPassword = "Please confirm your password.";
    else if (password !== confirmPassword)
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
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        setServerError(data.error ?? "Reset failed. Please try again.");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setServerError("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return success ? (
    <div className="flex flex-col gap-4">
      <Alert
        variant="success"
        message="Password reset successful! Redirecting to sign in…"
      />
      <Link href="/login" className="btn-primary">
        Sign in now
      </Link>
    </div>
  ) : (
    <>
      {serverError && (
        <Alert variant="error" message={serverError} className="mb-5" />
      )}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <PasswordField
          id="password"
          label="New password"
          autoComplete="new-password"
          placeholder="Min 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          disabled={loading}
        />
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
        <ul className="text-xs text-[var(--color-text-secondary)] list-disc list-inside -mt-1">
          <li>Minimum 8 characters</li>
          <li>At least one uppercase letter</li>
          <li>At least one lowercase letter</li>
          <li>At least one number</li>
        </ul>
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <Spinner label="Resetting…" /> Resetting password…
            </>
          ) : (
            "Reset password"
          )}
        </button>
        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium"
          >
            ← Back to sign in
          </Link>
        </div>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="flex flex-col items-center mb-8">
          <div
            className="flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: "var(--color-primary)" }}
            aria-hidden="true"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            Set new password
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Choose a strong password for your account
          </p>
        </div>
        <Suspense
          fallback={
            <div className="flex justify-center">
              <Spinner />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
