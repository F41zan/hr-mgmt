"use client";

import { useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import Pagination from "@/components/ui/Pagination";
import { apiFetch, formatCurrency, formatDateShort } from "@/lib/apiClient";
import { formatMonth } from "@/lib/utils/dates";
import type { PayslipRow } from "./PayrollManagement";

export default function MyPayslips() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ payslips: PayslipRow[]; pagination: { page: number; pages: number; total: number } } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<typeof data>(`/api/payroll/payslips?scope=mine&page=${page}&limit=12`)
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, [page]);

  const latest = data?.payslips[0];

  return (
    <div className="space-y-6">
      {error && <Alert variant="error" message={error} />}

      {latest && (
        <div className="stat-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">Latest payslip · {formatMonth(latest.month)}</p>
            <p className="text-3xl font-bold text-[var(--color-primary)] mt-1">{formatCurrency(latest.netPay)}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              Gross {formatCurrency(latest.grossEarnings)} · Deductions {formatCurrency(latest.totalDeductions)}
            </p>
          </div>
          <a className="btn-primary w-auto" href={`/api/payroll/payslips/${latest._id}/pdf?download=1`}>
            Download PDF
          </a>
        </div>
      )}

      <div className="stat-card p-0 overflow-hidden">
        <h2 className="px-5 py-4 border-b border-[var(--color-primary-border)] font-semibold">Payslip History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-primary-light)] text-left">
                {["Month", "Paid days", "Gross", "Deductions", "Net pay", "Issued", ""].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-primary-border)]">
              {!data ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">Loading…</td></tr>
              ) : data.payslips.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">No payslips have been issued yet</td></tr>
              ) : (
                data.payslips.map((p) => (
                  <tr key={p._id}>
                    <td className="px-4 py-3 font-medium">{formatMonth(p.month)}</td>
                    <td className="px-4 py-3">{p.paidDays} / {p.workingDays}</td>
                    <td className="px-4 py-3">{formatCurrency(p.grossEarnings)}</td>
                    <td className="px-4 py-3 text-red-600">{formatCurrency(p.totalDeductions)}</td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(p.netPay)}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatDateShort(p.publishedAt)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <a className="text-xs font-semibold text-[var(--color-primary)] hover:underline mr-3" href={`/api/payroll/payslips/${p._id}/pdf`} target="_blank" rel="noreferrer">View</a>
                      <a className="text-xs font-semibold text-[var(--color-primary)] hover:underline" href={`/api/payroll/payslips/${p._id}/pdf?download=1`}>Download</a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data && <Pagination {...data.pagination} page={page} onChange={setPage} />}
      </div>
    </div>
  );
}
