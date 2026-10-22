"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import FormField from "@/components/ui/FormField";
import PasswordField from "@/components/ui/PasswordField";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  /* Client-side validation only for UX — server re-validates everything */
  function validate(): boolean {
    const errs: FieldErrors = {};
    if (!email.trim()) errs.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(email))
      errs.email = "Invalid email address.";
    if (!password) errs.password = "Password is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json()) as {
        user?: { role: string };
        error?: string;
      };

      if (!res.ok || !data.user) {
        setServerError(data.error ?? "Login failed. Please try again.");
        return;
      }

      // Validate and use callbackUrl only if it's an internal path
      const safeCallback =
        callbackUrl &&
        callbackUrl.startsWith("/") &&
        !callbackUrl.startsWith("//") &&
        !callbackUrl.includes("://")
          ? callbackUrl
          : null;

      const dest =
        safeCallback ??
        (data.user.role === "admin"
          ? "/admin/dashboard"
          : data.user.role === "hr"
            ? "/hr/dashboard"
            : "/employee/dashboard");

      router.push(dest);
      router.refresh();
    } catch {
      setServerError("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: "var(--color-primary)" }}
            aria-hidden="true"
          >
            <svg width="30" height="30" viewBox="0 0 28 28" fill="none">
              <path
                d="M5 22v-2a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v2"
                stroke="#fff"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="14" cy="9" r="4" stroke="#fff" strokeWidth="2.2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            Welcome back
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Sign in to HR Management
          </p>
        </div>

        {/* Server error */}
        {serverError && (
          <Alert variant="error" message={serverError} className="mb-5" />
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-5"
        >
          <FormField
            id="email"
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            disabled={loading}
          />

          <PasswordField
            id="password"
            label="Password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            disabled={loading}
          />

          {/* Forgot password link */}
          <div className="flex justify-end -mt-2">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] rounded"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="btn-primary mt-1"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <Spinner label="Signing in…" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        {/* No public registration — accounts are provisioned by Admin */}
        <div className="mt-6 pt-5 border-t border-[var(--color-primary-border)] text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Don&apos;t have an account?{" "}
            <span className="font-medium text-[var(--color-text)]">
              Contact your administrator
            </span>{" "}
            to get access.
          </p>
        </div>
      </div>
    </div>
  );
}
