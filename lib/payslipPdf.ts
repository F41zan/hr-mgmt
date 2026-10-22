/**
 * lib/payslipPdf.ts
 * Renders a payslip as a single-page A4 PDF. Pure — no database access.
 */

import type { IPayslip } from "@/lib/models/Payslip";
import { SimplePdf } from "@/lib/pdf";
import { formatMonth, toDateString } from "@/lib/utils/dates";

const inr = (v: number) =>
  "Rs. " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v);

const BLUE: [number, number, number] = [37, 99, 235];
const LIGHT: [number, number, number] = [239, 246, 255];
const MUTED: [number, number, number] = [100, 116, 139];
const BORDER: [number, number, number] = [191, 219, 254];

/** Convert a whole number of rupees to words (Indian numbering). */
export function amountInWords(amount: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (n: number) => (n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]} ${ones[n % 10]}`.trim());
  const three = (n: number) =>
    n >= 100 ? `${ones[Math.floor(n / 100)]} Hundred ${two(n % 100)}`.trim() : two(n);

  let n = Math.round(amount);
  if (n === 0) return "Zero Rupees Only";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(`${three(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (n) parts.push(three(n));
  return `${parts.join(" ")} Rupees Only`;
}

export function renderPayslipPdf(p: Pick<IPayslip,
  "month" | "employee" | "workingDays" | "paidDays" | "lopDays" | "earnings" |
  "deductions" | "grossEarnings" | "totalDeductions" | "netPay" | "status">): Buffer {
  const pdf = new SimplePdf();
  const left = 40;
  const right = pdf.width - 40;
  const width = right - left;
  const company = process.env.COMPANY_NAME ?? "HR Management";

  // Header band
  pdf.rect(0, 0, pdf.width, 90, { fill: BLUE });
  pdf.text(left, 42, company, { size: 20, bold: true, color: [255, 255, 255] });
  pdf.text(left, 64, "Payslip", { size: 12, color: [219, 234, 254] });
  pdf.text(right, 42, formatMonth(p.month), { size: 14, bold: true, color: [255, 255, 255], align: "right" });
  if (p.status === "draft")
    pdf.text(right, 64, "DRAFT", { size: 11, bold: true, color: [253, 224, 71], align: "right" });

  // Employee details
  let y = 115;
  pdf.rect(left, y, width, 96, { fill: LIGHT, stroke: BORDER });
  const details: [string, string][] = [
    ["Employee Name", p.employee.name],
    ["Employee ID", p.employee.code],
    ["Department", p.employee.department ?? "-"],
    ["Designation", p.employee.designation ?? "-"],
    ["Working Days", String(p.workingDays)],
    ["Paid Days", String(p.paidDays)],
    ["Loss of Pay Days", String(p.lopDays)],
    ["Date of Joining", p.employee.joiningDate ? toDateString(p.employee.joiningDate) : "-"],
  ];
  details.forEach(([label, value], i) => {
    const col = i < 4 ? 0 : 1;
    const row = i % 4;
    const x = left + 14 + col * (width / 2);
    const ry = y + 22 + row * 20;
    pdf.text(x, ry, label, { size: 9, color: MUTED });
    pdf.text(x + 105, ry, value, { size: 10, bold: true });
  });

  // Earnings / deductions tables
  y += 120;
  const colW = (width - 20) / 2;
  const drawTable = (x: number, title: string, lines: { label: string; amount: number }[], total: string, totalValue: number) => {
    pdf.rect(x, y, colW, 26, { fill: BLUE });
    pdf.text(x + 12, y + 17, title, { size: 10, bold: true, color: [255, 255, 255] });
    pdf.text(x + colW - 12, y + 17, "Amount", { size: 10, bold: true, color: [255, 255, 255], align: "right" });
    let ry = y + 26;
    const rows = Math.max(p.earnings.length, p.deductions.length, 1);
    for (let i = 0; i < rows; i++) {
      const line = lines[i];
      pdf.rect(x, ry, colW, 24, { stroke: BORDER, fill: i % 2 ? LIGHT : [255, 255, 255] });
      if (line) {
        pdf.text(x + 12, ry + 16, line.label, { size: 10 });
        pdf.text(x + colW - 12, ry + 16, inr(line.amount), { size: 10, align: "right" });
      }
      ry += 24;
    }
    pdf.rect(x, ry, colW, 26, { fill: [219, 234, 254], stroke: BORDER });
    pdf.text(x + 12, ry + 17, total, { size: 10, bold: true });
    pdf.text(x + colW - 12, ry + 17, inr(totalValue), { size: 10, bold: true, align: "right" });
    return ry + 26;
  };
  const endEarn = drawTable(left, "Earnings", p.earnings, "Gross Earnings", p.grossEarnings);
  const endDed = drawTable(left + colW + 20, "Deductions", p.deductions, "Total Deductions", p.totalDeductions);

  // Net pay
  y = Math.max(endEarn, endDed) + 24;
  pdf.rect(left, y, width, 60, { fill: LIGHT, stroke: BLUE, lineWidth: 1.2 });
  pdf.text(left + 16, y + 26, "NET PAY", { size: 11, bold: true, color: MUTED });
  pdf.text(right - 16, y + 30, inr(p.netPay), { size: 20, bold: true, color: BLUE, align: "right" });
  pdf.text(left + 16, y + 46, amountInWords(p.netPay), { size: 9, color: MUTED });

  // Footer
  pdf.line(left, pdf.height - 60, right, pdf.height - 60);
  pdf.text(pdf.width / 2, pdf.height - 42, "This is a computer-generated payslip and does not require a signature.", {
    size: 8,
    color: MUTED,
    align: "center",
  });

  return pdf.toBuffer();
}
