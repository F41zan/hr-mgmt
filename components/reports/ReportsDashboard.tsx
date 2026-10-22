"use client";

import { useEffect, useState } from "react";
import Tabs from "@/components/ui/Tabs";
import Alert from "@/components/ui/Alert";
import { apiFetch, formatCurrency } from "@/lib/apiClient";
import { currentMonth, formatMonth } from "@/lib/utils/dates";
import { humanize } from "@/components/ui/Badge";
import { BarList, ColumnChart, StatTile } from "./Charts";

type TabId = "attendance" | "employees" | "payroll";

export default function ReportsDashboard() {
  const [tab, setTab] = useState<TabId>("attendance");
  return (
    <div>
      <Tabs
        tabs={[
          { id: "attendance", label: "Attendance" },
          { id: "employees", label: "Employee Statistics" },
          { id: "payroll", label: "Payroll" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "attendance" && <AttendanceReport />}
      {tab === "employees" && <EmployeeReport />}
      {tab === "payroll" && <PayrollReport />}
    </div>
  );
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h3 className="font-semibold text-[var(--color-text)]">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function CsvLink({ href, label = "Export CSV" }: { href: string; label?: string }) {
  return (
    <a href={href} className="btn-secondary px-3 py-1.5 text-xs whitespace-nowrap">
      ⬇ {label}
    </a>
  );
}

const th = "px-3 py-2.5 font-semibold text-[var(--color-text-secondary)] whitespace-nowrap";
const td = "px-3 py-2.5 tabular-nums";

// ── Attendance ────────────────────────────────────────────────────────────────

interface AttendanceData {
  month: string;
  workingDays: number;
  totals: { present: number; absent: number; halfDay: number; onLeave: number; late: number; employees: number; avgAttendanceRate: number };
  daily: { date: string; present: number; absent: number; halfDay: number; onLeave: number; late: number }[];
  rows: { id: string; employeeId: string; name: string; department: string; present: number; halfDay: number; absent: number; onLeave: number; late: number; earlyDepartures: number; avgHours: number; attendanceRate: number }[];
}

function AttendanceReport() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<AttendanceData | null>(null);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<"name" | "rate" | "late">("name");

  useEffect(() => {
    apiFetch<AttendanceData>(`/api/reports/attendance?month=${month}`)
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, [month]);

  const rows = [...(data?.rows ?? [])].sort((a, b) =>
    sort === "rate" ? a.attendanceRate - b.attendanceRate : sort === "late" ? b.late - a.late : a.name.localeCompare(b.name),
  );

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" message={error} />}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="form-label" htmlFor="rep-month">Month</label>
          <input id="rep-month" type="month" className="form-input" value={month} max={currentMonth()} onChange={(e) => { setData(null); setMonth(e.target.value); }} />
        </div>
        <div className="ml-auto"><CsvLink href={`/api/reports/attendance?month=${month}&format=csv`} /></div>
      </div>

      {!data ? (
        <div className="stat-card text-center text-[var(--color-text-secondary)]">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatTile label="Avg attendance" value={`${data.totals.avgAttendanceRate}%`} sub={`${data.workingDays} working days so far`} />
            <StatTile label="Present days" value={String(data.totals.present)} />
            <StatTile label="Absent days" value={String(data.totals.absent)} />
            <StatTile label="Leave days" value={String(data.totals.onLeave)} />
            <StatTile label="Late arrivals" value={String(data.totals.late)} />
          </div>

          <Card title={`Employees present per day · ${formatMonth(month)}`}>
            <ColumnChart
              data={data.daily.map((d) => ({
                label: d.date.slice(8),
                value: d.present + d.halfDay,
                hint: `${d.date}: ${d.present} present, ${d.halfDay} half-day, ${d.absent} absent, ${d.onLeave} on leave, ${d.late} late`,
              }))}
              emptyText="No attendance recorded this month"
            />
          </Card>

          <Card
            title="Employee summary"
            action={
              <select className="form-input w-auto text-xs py-1" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                <option value="name">Sort: name</option>
                <option value="rate">Sort: lowest attendance</option>
                <option value="late">Sort: most late</option>
              </select>
            }
          >
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--color-primary-light)] text-left">
                    {["Employee", "Department", "Present", "Half day", "Absent", "Leave", "Late", "Early out", "Avg hrs", "Attendance"].map((h) => <th key={h} className={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-primary-border)]">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2.5"><p className="font-medium">{r.name}</p><p className="text-xs text-[var(--color-text-secondary)]">{r.employeeId}</p></td>
                      <td className="px-3 py-2.5 text-[var(--color-text-secondary)]">{r.department}</td>
                      <td className={td}>{r.present}</td>
                      <td className={td}>{r.halfDay}</td>
                      <td className={td}>{r.absent}</td>
                      <td className={td}>{r.onLeave}</td>
                      <td className={td}>{r.late}</td>
                      <td className={td}>{r.earlyDepartures}</td>
                      <td className={td}>{r.avgHours || "—"}</td>
                      <td className={`${td} font-semibold ${r.attendanceRate < 75 ? "text-red-600" : ""}`}>{r.attendanceRate}%</td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td colSpan={10} className="px-3 py-6 text-center text-[var(--color-text-secondary)]">No employees</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Employees ─────────────────────────────────────────────────────────────────

interface EmployeeData {
  totals: { total: number; active: number; onLeave: number; inactive: number; terminated: number; newThisMonth: number };
  byDepartment: { label: string; count: number }[];
  byType: { label: string; count: number }[];
  byGender: { label: string; count: number }[];
  byTenure: { label: string; count: number }[];
  trend: { month: string; joined: number; left: number }[];
}

function EmployeeReport() {
  const [data, setData] = useState<EmployeeData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<EmployeeData>("/api/reports/employees").then(setData).catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <Alert variant="error" message={error} />;
  if (!data) return <div className="stat-card text-center text-[var(--color-text-secondary)]">Loading…</div>;

  const toData = (rows: { label: string; count: number }[]) => rows.map((r) => ({ label: humanize(r.label), value: r.count }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><CsvLink href="/api/reports/employees?format=csv" label="Export directory" /></div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatTile label="Total employees" value={String(data.totals.total)} />
        <StatTile label="Active" value={String(data.totals.active)} />
        <StatTile label="On leave" value={String(data.totals.onLeave)} />
        <StatTile label="Inactive / exited" value={String(data.totals.inactive + data.totals.terminated)} />
        <StatTile label="Joined this month" value={String(data.totals.newThisMonth)} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Headcount by department"><BarList data={toData(data.byDepartment)} /></Card>
        <Card title="Headcount by employment type"><BarList data={toData(data.byType)} /></Card>
        <Card title="Tenure"><BarList data={toData(data.byTenure)} /></Card>
        <Card title="Gender"><BarList data={toData(data.byGender)} /></Card>
      </div>
      <Card title="New joiners · last 12 months">
        <ColumnChart
          data={data.trend.map((t) => ({ label: formatMonth(t.month).slice(0, 3), value: t.joined, hint: `${formatMonth(t.month)}: ${t.joined} joined, ${t.left} left` }))}
          emptyText="No joiners in the last 12 months"
        />
        <table className="w-full text-xs mt-4">
          <thead><tr className="text-left text-[var(--color-text-secondary)]"><th className="py-1">Month</th><th>Joined</th><th>Left (approx.)</th></tr></thead>
          <tbody>
            {data.trend.map((t) => (
              <tr key={t.month} className="border-t border-[var(--color-primary-border)]"><td className="py-1">{formatMonth(t.month)}</td><td>{t.joined}</td><td>{t.left}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── Payroll ───────────────────────────────────────────────────────────────────

interface PayrollData {
  year: number;
  month: string | null;
  ytd: { gross: number; deductions: number; net: number };
  monthly: { month: string; headcount: number; gross: number; deductions: number; net: number; lopDays: number; published: number }[];
  byDepartment: { department: string; headcount: number; gross: number; net: number; average: number }[];
}

function PayrollReport() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState("");
  const [data, setData] = useState<PayrollData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<PayrollData>(`/api/reports/payroll?year=${year}${month ? `&month=${month}` : ""}`)
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, [year, month]);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const compact = (v: number) => new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(v);

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" message={error} />}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="form-label" htmlFor="rep-year">Year</label>
          <select id="rep-year" className="form-input" value={year} onChange={(e) => { setData(null); setYear(Number(e.target.value)); setMonth(""); }}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {data?.month && (
          <div className="ml-auto"><CsvLink href={`/api/reports/payroll?year=${year}&month=${data.month}&format=csv`} label={`Payroll register ${data.month}`} /></div>
        )}
      </div>

      {!data ? (
        <div className="stat-card text-center text-[var(--color-text-secondary)]">Loading…</div>
      ) : data.monthly.length === 0 ? (
        <div className="stat-card text-center text-[var(--color-text-secondary)] py-10">No payroll has been run for {year}.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatTile label={`Gross pay ${year} (YTD)`} value={formatCurrency(data.ytd.gross)} />
            <StatTile label="Deductions (YTD)" value={formatCurrency(data.ytd.deductions)} />
            <StatTile label="Net pay (YTD)" value={formatCurrency(data.ytd.net)} />
          </div>
          <Card title={`Monthly gross payroll · ${year}`}>
            <ColumnChart
              data={data.monthly.map((m) => ({
                label: formatMonth(m.month).slice(0, 3),
                value: m.gross,
                hint: `${formatMonth(m.month)}: gross ${formatCurrency(m.gross)}, net ${formatCurrency(m.net)}, ${m.headcount} payslips`,
              }))}
              format={compact}
            />
            <div className="overflow-x-auto -mx-6 mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--color-primary-light)] text-left">
                    {["Month", "Payslips", "Published", "Gross", "Deductions", "Net", "LOP days", ""].map((h) => <th key={h} className={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-primary-border)]">
                  {data.monthly.map((m) => (
                    <tr key={m.month} className={m.month === data.month ? "bg-[var(--color-primary-light)]" : ""}>
                      <td className="px-3 py-2.5 font-medium">{formatMonth(m.month)}</td>
                      <td className={td}>{m.headcount}</td>
                      <td className={td}>{m.published}</td>
                      <td className={td}>{formatCurrency(m.gross)}</td>
                      <td className={td}>{formatCurrency(m.deductions)}</td>
                      <td className={`${td} font-semibold`}>{formatCurrency(m.net)}</td>
                      <td className={td}>{m.lopDays}</td>
                      <td className="px-3 py-2.5">
                        <button className="text-xs font-semibold text-[var(--color-primary)] hover:underline" onClick={() => { setData(null); setMonth(m.month); }}>By department</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          {data.month && (
            <Card title={`Gross payroll by department · ${formatMonth(data.month)}`}>
              <BarList
                data={data.byDepartment.map((d) => ({
                  label: d.department,
                  value: d.gross,
                  hint: `${d.department}: ${d.headcount} employees, gross ${formatCurrency(d.gross)}, average ${formatCurrency(d.average)}`,
                }))}
                format={formatCurrency}
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
