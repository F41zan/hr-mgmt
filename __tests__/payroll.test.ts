/**
 * __tests__/payroll.test.ts
 * Salary calculation, amount-in-words and payslip PDF output.
 */

import { calculatePayroll, monthlyGross, type SalaryInput } from "@/lib/utils/payroll";
import { amountInWords, renderPayslipPdf } from "@/lib/payslipPdf";

const salary: SalaryInput = {
  basic: 40000,
  hra: 16000,
  specialAllowance: 10000,
  otherAllowances: 2000,
  pfPercent: 12,
  professionalTax: 200,
  tdsPercent: 10,
  otherDeductions: 0,
};

describe("calculatePayroll", () => {
  it("pays the full salary for a full month with no loss of pay", () => {
    const r = calculatePayroll(salary, { workingDays: 22, eligibleDays: 22, lopDays: 0 });
    expect(r.paidDays).toBe(22);
    expect(r.grossEarnings).toBe(68000);
    // PF 12% of 40000 = 4800, PT 200, TDS 10% of 68000 = 6800
    expect(r.totalDeductions).toBe(4800 + 200 + 6800);
    expect(r.netPay).toBe(68000 - 11800);
    expect(r.grossEarnings).toBe(monthlyGross(salary));
  });

  it("prorates earnings and PF by loss-of-pay days", () => {
    const r = calculatePayroll(salary, { workingDays: 20, eligibleDays: 20, lopDays: 2 });
    expect(r.paidDays).toBe(18);
    expect(r.lopDays).toBe(2);
    expect(r.earnings.find((l) => l.label === "Basic Salary")?.amount).toBe(36000);
    expect(r.deductions.find((l) => l.label === "Provident Fund")?.amount).toBe(4320);
  });

  it("supports half-day loss of pay", () => {
    const r = calculatePayroll(salary, { workingDays: 20, eligibleDays: 20, lopDays: 0.5 });
    expect(r.paidDays).toBe(19.5);
  });

  it("pays mid-month joiners only from their joining date", () => {
    const r = calculatePayroll(salary, { workingDays: 22, eligibleDays: 11, lopDays: 0 });
    expect(r.paidDays).toBe(11);
    expect(r.grossEarnings).toBe(34000);
  });

  it("never produces negative pay and skips fixed deductions when nothing is earned", () => {
    const r = calculatePayroll(salary, { workingDays: 22, eligibleDays: 22, lopDays: 40 });
    expect(r.paidDays).toBe(0);
    expect(r.grossEarnings).toBe(0);
    expect(r.deductions).toHaveLength(0);
    expect(r.netPay).toBe(0);
  });

  it("caps deductions at gross earnings", () => {
    const heavy = { ...salary, otherDeductions: 1_000_000 };
    const r = calculatePayroll(heavy, { workingDays: 22, eligibleDays: 22, lopDays: 0 });
    expect(r.totalDeductions).toBe(r.grossEarnings);
    expect(r.netPay).toBe(0);
  });
});

describe("amountInWords", () => {
  it.each([
    [0, "Zero Rupees Only"],
    [56200, "Fifty Six Thousand Two Hundred Rupees Only"],
    [1234567, "Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Rupees Only"],
    [10000000, "One Crore Rupees Only"],
  ])("%d → %s", (n, words) => {
    expect(amountInWords(n)).toBe(words);
  });
});

describe("renderPayslipPdf", () => {
  const payslip = {
    month: "2026-09",
    employee: { name: "Asha Rao (QA)", code: "EMP001", email: "a@x.com", department: "Engineering", designation: "Engineer" },
    workingDays: 22,
    paidDays: 21,
    lopDays: 1,
    earnings: [{ label: "Basic Salary", amount: 38182 }],
    deductions: [{ label: "Provident Fund", amount: 4582 }],
    grossEarnings: 38182,
    totalDeductions: 4582,
    netPay: 33600,
    status: "published" as const,
  };

  it("produces a structurally valid PDF", () => {
    const buf = renderPayslipPdf(payslip);
    const text = buf.toString("latin1");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);

    // xref offsets must point at the start of each object
    const xrefStart = Number(text.match(/startxref\n(\d+)/)![1]);
    expect(text.slice(xrefStart, xrefStart + 4)).toBe("xref");
    const offsets = [...text.slice(xrefStart).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    expect(offsets).toHaveLength(6);
    offsets.forEach((off, i) => {
      const header = `${i + 1} 0 obj\n`;
      expect(text.slice(off, off + header.length)).toBe(header);
    });
  });

  it("escapes parentheses in text and includes key values", () => {
    const text = renderPayslipPdf(payslip).toString("latin1");
    expect(text).toContain("(Asha Rao \\(QA\\)) Tj");
    expect(text).toContain("September 2026");
    expect(text).toContain("Rs. 33,600");
    expect(text).not.toContain("DRAFT");
  });

  it("marks drafts", () => {
    const text = renderPayslipPdf({ ...payslip, status: "draft" }).toString("latin1");
    expect(text).toContain("(DRAFT) Tj");
  });
});
