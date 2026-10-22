"use client";

import { useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import { apiFetch } from "@/lib/apiClient";

interface Contact {
  employeeId: string;
  phone: string;
  address: string;
  emergencyContact: { name: string; relationship: string; phone: string };
}

/** Lets a user edit the contact details on their linked employee record. */
export default function ContactDetailsForm() {
  const [contact, setContact] = useState<Contact | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ contact: Contact | null }>("/api/account/profile")
      .then((d) => setContact(d.contact))
      .catch(() => setContact(null));
  }, []);

  if (contact === undefined) return <p className="text-sm text-[var(--color-text-secondary)]">Loading…</p>;
  if (contact === null)
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">
        Your account isn&apos;t linked to an employee record, so there are no contact details to edit.
      </p>
    );

  const setEc = (k: keyof Contact["emergencyContact"], v: string) =>
    setContact({ ...contact, emergencyContact: { ...contact.emergencyContact, [k]: v } });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!contact) return;
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const d = await apiFetch<{ contact: Contact }>("/api/account/profile", {
        method: "PATCH",
        json: { phone: contact.phone, address: contact.address, emergencyContact: contact.emergencyContact },
      });
      setContact(d.contact);
      setSuccess("Contact details saved.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-[var(--color-text)]">
        Contact details <span className="text-xs font-normal text-[var(--color-text-secondary)]">· {contact.employeeId}</span>
      </h2>
      {error && <Alert variant="error" message={error} />}
      {success && <Alert variant="success" message={success} />}
      <div>
        <label className="form-label" htmlFor="c-phone">Phone</label>
        <input id="c-phone" className="form-input" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
      </div>
      <div>
        <label className="form-label" htmlFor="c-address">Address</label>
        <textarea id="c-address" rows={2} className="form-input" maxLength={500} value={contact.address}
          onChange={(e) => setContact({ ...contact, address: e.target.value })} />
      </div>
      <fieldset className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <legend className="form-label mb-2">Emergency contact</legend>
        <input aria-label="Emergency contact name" className="form-input" placeholder="Name" value={contact.emergencyContact.name} onChange={(e) => setEc("name", e.target.value)} />
        <input aria-label="Relationship" className="form-input" placeholder="Relationship" value={contact.emergencyContact.relationship} onChange={(e) => setEc("relationship", e.target.value)} />
        <input aria-label="Emergency contact phone" className="form-input" placeholder="Phone" value={contact.emergencyContact.phone} onChange={(e) => setEc("phone", e.target.value)} />
      </fieldset>
      <button type="submit" className="btn-primary sm:w-auto sm:self-start" disabled={loading}>
        {loading ? "Saving…" : "Save contact details"}
      </button>
    </form>
  );
}
