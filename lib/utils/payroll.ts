/**
 * lib/utils/payroll.ts
 * Pure salary calculation — no database access, easy to unit test.
 *
 * Rules:
 *  - Working days = Mon–Fri in the month.
 *  - Employees who joined mid-month are paid only from their joining date.
 *  - Loss of pay (LOP) = approved unpaid leave + "absent" days (+0.5 per half-day).
 *  - Earnings are prorated by paidDays / workingDays.
 *  - PF = pfPercent of earned basic, TDS = tdsPercent of gross,
 *    professional tax and other deductions are fixed (skipped if nothing earned).
 */

export interface SalaryInput {
  basic: number;
  hra: number;
  specialAllowance: number;
  otherAllowances: number;
  pfPercent: number;
  professionalTax: number;
  tdsPercent: number;
  otherDeductions: number;
}

export interface PayrollLine {
  label: string;
  amount: number;
}

export interface PayrollResult {
  workingDays: number;
  paidDays: number;
  lopDays: number;
  earnings: PayrollLine[];
  deductions: PayrollLine[];
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
}

const round = (v: number) => Math.round(v);

export function calculatePayroll(
  salary: SalaryInput,
  opts: {
    workingDays: number; // weekdays in the month
    eligibleDays: number; // weekdays from joining date (or month start) to month end
    lopDays: number;
  },
): PayrollResult {
  const { workingDays } = opts;
  const lopDays = Math.min(Math.max(opts.lopDays, 0), opts.eligibleDays);
  const paidDays = Math.max(opts.eligibleDays - lopDays, 0);
  const factor = workingDays > 0 ? paidDays / workingDays : 0;

  const earnings: PayrollLine[] = [
    { label: "Basic Salary", amount: round(salary.basic * factor) },
    { label: "House Rent Allowance", amount: round(salary.hra * factor) },
    { label: "Special Allowance", amount: round(salary.specialAllowance * factor) },
    { label: "Other Allowances", amount: round(salary.otherAllowances * factor) },
  ].filter((l) => l.amount > 0);

  const grossEarnings = earnings.reduce((s, l) => s + l.amount, 0);
  const earnedBasic = earnings.find((l) => l.label === "Basic Salary")?.amount ?? 0;

  const deductions: PayrollLine[] =
    grossEarnings > 0
      ? [
          { label: "Provident Fund", amount: round((earnedBasic * salary.pfPercent) / 100) },
          { label: "Professional Tax", amount: round(salary.professionalTax) },
          { label: "Income Tax (TDS)", amount: round((grossEarnings * salary.tdsPercent) / 100) },
          { label: "Other Deductions", amount: round(salary.otherDeductions) },
        ].filter((l) => l.amount > 0)
      : [];

  const totalDeductions = Math.min(
    deductions.reduce((s, l) => s + l.amount, 0),
    grossEarnings,
  );

  return {
    workingDays,
    paidDays,
    lopDays,
    earnings,
    deductions,
    grossEarnings,
    totalDeductions,
    netPay: grossEarnings - totalDeductions,
  };
}

/** Monthly gross for a structure (used for previews and reports). */
export function monthlyGross(s: Pick<SalaryInput, "basic" | "hra" | "specialAllowance" | "otherAllowances">) {
  return s.basic + s.hra + s.specialAllowance + s.otherAllowances;
}
