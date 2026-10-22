"use client";

import { useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import { apiFetch } from "@/lib/apiClient";
import {
  CONFIGURABLE_ROLES,
  PERMISSION_LABELS,
  PERMISSION_VALUES,
  type ConfigurableRole,
  type Permission,
} from "@/lib/permissions";

type Matrix = Record<ConfigurableRole, Permission[]>;

export default function PermissionsMatrix() {
  const [saved, setSaved] = useState<Matrix | null>(null);
  const [draft, setDraft] = useState<Matrix | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ roles: Matrix }>("/api/settings/permissions")
      .then((d) => {
        setSaved(d.roles);
        setDraft(d.roles);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  if (!draft || !saved) return error ? <Alert variant="error" message={error} /> : <p className="text-sm">Loading…</p>;

  const toggle = (role: ConfigurableRole, p: Permission) =>
    setDraft({
      ...draft,
      [role]: draft[role].includes(p) ? draft[role].filter((x) => x !== p) : [...draft[role], p],
    });

  const dirty = CONFIGURABLE_ROLES.filter(
    (r) => [...draft[r]].sort().join() !== [...saved[r]].sort().join(),
  );

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      for (const role of dirty)
        await apiFetch("/api/settings/permissions", { method: "PUT", json: { role, permissions: draft[role] } });
      setSaved(draft);
      setSuccess("Permissions updated. Changes apply on the users' next request.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" message={error} />}
      {success && <Alert variant="success" message={success} />}
      <div className="stat-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-primary-light)] text-left">
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">Permission</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)] text-center">Admin</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)] text-center">HR</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)] text-center">Employee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-primary-border)]">
              {PERMISSION_VALUES.map((p) => (
                <tr key={p}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{PERMISSION_LABELS[p].label}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{PERMISSION_LABELS[p].description}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input type="checkbox" checked disabled aria-label={`Admin: ${PERMISSION_LABELS[p].label} (always on)`} />
                  </td>
                  {CONFIGURABLE_ROLES.map((role) => (
                    <td key={role} className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 cursor-pointer"
                        checked={draft[role].includes(p)}
                        onChange={() => toggle(role, p)}
                        aria-label={`${role}: ${PERMISSION_LABELS[p].label}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)]">
        Admins always have every permission. Employee, department and attendance management stay limited to Admin and HR.
        Every user can apply for leave, view their own payslips and see interviews they are assigned to.
      </p>
      <div className="flex gap-3">
        <button className="btn-primary w-auto" disabled={!dirty.length || saving} onClick={save}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button className="btn-secondary" disabled={!dirty.length || saving} onClick={() => setDraft(saved)}>
          Reset
        </button>
      </div>
    </div>
  );
}
