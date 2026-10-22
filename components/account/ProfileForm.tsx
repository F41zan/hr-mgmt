"use client";

import { useState, FormEvent } from "react";
import FormField from "@/components/ui/FormField";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";

export default function ProfileForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [nameError, setNameError] = useState("");
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    if (!name.trim()) {
      setNameError("Name is required.");
      return false;
    }
    if (name.trim().length > 100) {
      setNameError("Name must be ≤ 100 characters.");
      return false;
    }
    setNameError("");
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");
    setSuccess("");
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as {
        user?: { name: string };
        error?: string;
      };
      if (!res.ok) {
        setServerError(data.error ?? "Update failed.");
        return;
      }
      setName(data.user?.name ?? name);
      setSuccess("Profile updated successfully.");
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-[var(--color-text)]">
        Edit profile
      </h2>

      {serverError && <Alert variant="error" message={serverError} />}
      {success && <Alert variant="success" message={success} />}

      <FormField
        id="profile-name"
        label="Full name"
        type="text"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={nameError}
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
              <Spinner /> Saving…
            </>
          ) : (
            "Save changes"
          )}
        </button>
      </div>
    </form>
  );
}
