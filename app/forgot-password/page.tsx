"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import FormField from "@/components/ui/FormField";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    if (!email.trim()) {
      setEmailError("Email is required.");
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setEmailError("Invalid email address.");
      return false;
    }
    setEmailError("");
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { message?: string; error?: string };

      if (res.status === 429) {
        setServerError(
          data.error ?? "Too many requests. Please try again later.",
        );
        return;
      }
      // Always show success — prevents account enumeration
      setSubmitted(true);
    } catch {
      setServerError("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Icon */}
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
              <rect x="2" y="4" width="20" height="16" rx="3" />
              <path d="M2 7l10 7 10-7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            Reset password
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1 text-center">
            Enter your email and we&apos;ll send a reset link
          </p>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center gap-4">
            <Alert
              variant="success"
              message="If that email is registered, a reset link has been sent. Check your inbox."
            />
            <Link href="/login" className="btn-primary mt-2">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
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
                error={emailError}
                disabled={loading}
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <Spinner label="Sending…" /> Sending reset link…
                  </>
                ) : (
                  "Send reset link"
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
        )}
      </div>
    </div>
  );
}
