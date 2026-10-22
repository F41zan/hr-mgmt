/**
 * lib/utils/csv.ts
 * Minimal RFC 4180 CSV writer. Prefixes formula-like cells with a quote so
 * exported files can't execute formulas when opened in a spreadsheet.
 */

type Cell = string | number | boolean | null | undefined;

function escapeCell(value: Cell): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s) && typeof value === "string") s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  // BOM so Excel opens UTF-8 correctly
  return "﻿" + [headers, ...rows].map((r) => r.map(escapeCell).join(",")).join("\r\n");
}
