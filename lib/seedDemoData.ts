/**
 * lib/seedDemoData.ts
 * Seeds realistic demo HR data on first run (when employees collection is empty).
 * Called automatically from connectDB after connection is established.
 */

import mongoose from "mongoose";

export async function seedDemoData() {
  try {
    // Lazy imports to avoid circular deps
    const Employee = (await import("./models/Employee")).default;
    const Attendance = (await import("./models/Attendance")).default;
    const Leave = (await import("./models/Leave")).default;
    const User = (await import("./models/User")).default;
    const Department = (await import("./models/Department")).default;
    const Designation = (await import("./models/Designation")).default;

    const empCount = await Employee.countDocuments();
    if (empCount > 0) return; // Already seeded

    console.info("[hr-mgmt] Seeding demo HR data…");

    // ── Create departments ────────────────────────────────────────────────────
    const deptData = [
      { name: "Engineering", code: "ENG" },
      { name: "Human Resources", code: "HR" },
      { name: "Finance", code: "FIN" },
      { name: "Marketing", code: "MKT" },
      { name: "Operations", code: "OPS" },
      { name: "Sales", code: "SAL" },
      { name: "Design", code: "DES" },
    ];

    const createdDepts = await Department.insertMany(deptData);
    const deptMap: Record<string, string> = {};
    createdDepts.forEach((d) => {
      deptMap[d.name] = d._id.toString();
    });

    // ── Create designations ───────────────────────────────────────────────────
    const designationData = [
      { name: "HR Manager", department: "Human Resources" },
      { name: "Senior Developer", department: "Engineering" },
      { name: "Frontend Developer", department: "Engineering" },
      { name: "Backend Developer", department: "Engineering" },
      { name: "Financial Analyst", department: "Finance" },
      { name: "Marketing Lead", department: "Marketing" },
      { name: "Operations Manager", department: "Operations" },
      { name: "Sales Executive", department: "Sales" },
      { name: "QA Engineer", department: "Engineering" },
      { name: "UI/UX Designer", department: "Design" },
    ];

    const createdDes = await Designation.insertMany(
      designationData.map((d) => ({
        name: d.name,
        departmentId: new mongoose.Types.ObjectId(
          deptMap[d.department] || createdDepts[0]._id,
        ),
      })),
    );
    const designationMap: Record<string, string> = {};
    createdDes.forEach((d) => {
      designationMap[d.name] = d._id.toString();
    });

    // ── Create demo user accounts ─────────────────────────────────────────────
    const bcrypt = await import("bcryptjs");
    const hash = (p: string) => bcrypt.default.hash(p, 10);

    const demoUsers = await User.insertMany([
      {
        name: "Sarah Johnson",
        email: "sarah.johnson@company.com",
        passwordHash: await hash("Pass@123"),
        role: "hr",
        isActive: true,
      },
      {
        name: "James Wilson",
        email: "james.wilson@company.com",
        passwordHash: await hash("Pass@123"),
        role: "employee",
        isActive: true,
      },
      {
        name: "Emily Davis",
        email: "emily.davis@company.com",
        passwordHash: await hash("Pass@123"),
        role: "employee",
        isActive: true,
      },
      {
        name: "Michael Brown",
        email: "michael.brown@company.com",
        passwordHash: await hash("Pass@123"),
        role: "employee",
        isActive: true,
      },
      {
        name: "Jessica Taylor",
        email: "jessica.taylor@company.com",
        passwordHash: await hash("Pass@123"),
        role: "employee",
        isActive: true,
      },
      {
        name: "David Martinez",
        email: "david.martinez@company.com",
        passwordHash: await hash("Pass@123"),
        role: "employee",
        isActive: true,
      },
      {
        name: "Lisa Anderson",
        email: "lisa.anderson@company.com",
        passwordHash: await hash("Pass@123"),
        role: "employee",
        isActive: true,
      },
      {
        name: "Robert Thomas",
        email: "robert.thomas@company.com",
        passwordHash: await hash("Pass@123"),
        role: "employee",
        isActive: true,
      },
      {
        name: "Jennifer White",
        email: "jennifer.white@company.com",
        passwordHash: await hash("Pass@123"),
        role: "employee",
        isActive: false,
      },
      {
        name: "Chris Harris",
        email: "chris.harris@company.com",
        passwordHash: await hash("Pass@123"),
        role: "employee",
        isActive: true,
      },
    ]);

    const depts = [
      "Engineering",
      "Engineering",
      "Engineering",
      "Human Resources",
      "Finance",
      "Marketing",
      "Operations",
      "Sales",
      "Engineering",
      "Design",
    ] as const;
    const desigs = [
      "HR Manager",
      "Senior Developer",
      "Frontend Developer",
      "Backend Developer",
      "Financial Analyst",
      "Marketing Lead",
      "Operations Manager",
      "Sales Executive",
      "QA Engineer",
      "UI/UX Designer",
    ];
    const phones = [
      "555-0101",
      "555-0102",
      "555-0103",
      "555-0104",
      "555-0105",
      "555-0106",
      "555-0107",
      "555-0108",
      "555-0109",
      "555-0110",
    ];

    const now = new Date();
    const y = now.getFullYear();

    const employees = await Employee.insertMany(
      demoUsers.map((u, i) => ({
        userId: u._id,
        employeeId: `EMP${String(i + 1).padStart(3, "0")}`,
        firstName: u.name.split(" ")[0],
        lastName: u.name.split(" ")[1] || u.name,
        email: u.email,
        phone: phones[i],
        departmentId: new mongoose.Types.ObjectId(
          deptMap[depts[i]] || createdDepts[0]._id,
        ),
        designationId: new mongoose.Types.ObjectId(
          designationMap[desigs[i]] || createdDes[0]._id,
        ),
        joiningDate: new Date(y - (i % 3), (i * 2) % 12, (i + 1) * 2),
        dateOfBirth: new Date(1990 + i, (i * 3) % 12, (i + 1) * 2),
        employmentType:
          i === 0 ? "full-time" : i % 5 === 0 ? "part-time" : "full-time",
        status: u.isActive ? (i === 5 ? "on_leave" : "active") : "inactive",
      })),
    );

    // ── Seed 30 days of attendance ────────────────────────────────────────────
    const {
      getCanonicalAttendanceDate,
      parseAttendanceDate,
      calculateLateArrival,
      calculateEarlyDeparture,
      calculateWorkingDuration,
    } = await import("./utils/attendance");
    // Weighted outcomes for a past working day
    const OUTCOMES = [
      "present",
      "present",
      "present",
      "present",
      "present",
      "late",
      "half-day",
      "absent",
    ] as const;
    const attendanceRecords: object[] = [];
    const pad = (n: number) => String(n).padStart(2, "0");
    // Wall-clock time on a business date (Asia/Kolkata)
    const at = (day: string, h: number, m: number) =>
      new Date(`${day}T${pad(h)}:${pad(m)}:00+05:30`);

    for (let d = 29; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      const day = getCanonicalAttendanceDate(date);
      const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
      if (dow === 0 || dow === 6) continue; // skip weekends

      for (const emp of employees) {
        if ((emp as IEmployee).status === "inactive") continue;
        const outcome =
          d === 0
            ? Math.random() < 0.85
              ? "present"
              : "late"
            : OUTCOMES[Math.floor(Math.random() * OUTCOMES.length)];

        const base = {
          employeeId: (emp as IEmployee)._id,
          attendanceDate: parseAttendanceDate(day),
        };
        if (outcome === "absent") {
          attendanceRecords.push({ ...base, status: "absent" });
          continue;
        }

        const rand = (n: number) => Math.floor(Math.random() * n);
        const checkInAt =
          outcome === "late" ? at(day, 9, 10 + rand(45)) : at(day, 8, 30 + rand(29));
        // Today: checked in only. Half day: leaves around 1 pm.
        const checkOutAt =
          d === 0
            ? undefined
            : outcome === "half-day"
              ? at(day, 13, rand(30))
              : at(day, 18, rand(40));
        const late = calculateLateArrival(checkInAt);
        const record: Record<string, unknown> = {
          ...base,
          status: outcome === "half-day" ? "half-day" : "present",
          checkInAt,
          isLate: late.isLate,
          lateMinutes: late.lateMinutes,
        };
        if (checkOutAt) {
          const early = calculateEarlyDeparture(checkOutAt);
          Object.assign(record, {
            checkOutAt,
            workingDurationMinutes: calculateWorkingDuration(checkInAt, checkOutAt),
            isEarlyDeparture: early.isEarlyDeparture,
            earlyDepartureMinutes: early.earlyDepartureMinutes,
          });
        }
        attendanceRecords.push(record);
      }
    }

    if (attendanceRecords.length) {
      await Attendance.insertMany(attendanceRecords, { ordered: false }).catch(
        (err: Error) =>
          console.warn("[hr-mgmt] Some demo attendance skipped:", err.message),
      );
    }

    // ── Seed leave requests ───────────────────────────────────────────────────
    const activeEmps = employees.filter(
      (e) => (e as IEmployee).status !== "inactive",
    );
    await Leave.insertMany([
      {
        employeeId: activeEmps[0]._id,
        leaveType: "annual",
        startDate: new Date(y, now.getMonth(), 15),
        endDate: new Date(y, now.getMonth(), 18),
        totalDays: 4,
        reason: "Family vacation",
        status: "approved",
      },
      {
        employeeId: activeEmps[1]._id,
        leaveType: "sick",
        startDate: new Date(y, now.getMonth(), now.getDate() + 2),
        endDate: new Date(y, now.getMonth(), now.getDate() + 3),
        totalDays: 2,
        reason: "Medical appointment",
        status: "pending",
      },
      {
        employeeId: activeEmps[2]._id,
        leaveType: "casual",
        startDate: new Date(y, now.getMonth(), now.getDate() + 5),
        endDate: new Date(y, now.getMonth(), now.getDate() + 5),
        totalDays: 1,
        reason: "Personal work",
        status: "pending",
      },
      {
        employeeId: activeEmps[3]._id,
        leaveType: "annual",
        startDate: new Date(y, now.getMonth() - 1, 10),
        endDate: new Date(y, now.getMonth() - 1, 14),
        totalDays: 5,
        reason: "Holiday trip",
        status: "approved",
      },
      {
        employeeId: activeEmps[4]._id,
        leaveType: "sick",
        startDate: new Date(y, now.getMonth() - 1, 5),
        endDate: new Date(y, now.getMonth() - 1, 6),
        totalDays: 2,
        reason: "Flu",
        status: "rejected",
      },
    ]);

    // ── Seed salary structures (so payroll can be run straight away) ─────────
    const SalaryStructure = (await import("./models/SalaryStructure")).default;
    await SalaryStructure.insertMany(
      activeEmps.map((e, i) => {
        const basic = 30000 + (i % 6) * 7500;
        return {
          employeeId: e._id,
          basic,
          hra: Math.round(basic * 0.4),
          specialAllowance: Math.round(basic * 0.25),
          otherAllowances: 2000,
          pfPercent: 12,
          professionalTax: 200,
          tdsPercent: basic >= 50000 ? 10 : 5,
          otherDeductions: 0,
          effectiveFrom: new Date(y, 0, 1),
        };
      }),
      { ordered: false },
    ).catch(() => {});

    console.info("[hr-mgmt] ✓ Demo HR data seeded successfully.");
  } catch (err) {
    console.warn("[hr-mgmt] Demo seed skipped:", (err as Error).message);
  }
}

// Needed for the Employee type reference inside the seed function
interface IEmployee {
  _id: mongoose.Types.ObjectId;
  status: string;
}
