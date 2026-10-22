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
    const STATUSES = [
      "present",
      "present",
      "present",
      "present",
      "present",
      "late",
      "absent",
      "on_leave",
    ] as const;
    const attendanceRecords: object[] = [];

    for (let d = 29; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      date.setHours(0, 0, 0, 0);
      const dow = date.getDay();
      if (dow === 0 || dow === 6) continue; // skip weekends

      for (const emp of employees) {
        if ((emp as IEmployee).status === "inactive") continue;
        const roll = Math.random();
        let status: string;
        if (d === 0) {
          // Today: mostly present
          status =
            roll < 0.75
              ? "present"
              : roll < 0.85
                ? "late"
                : roll < 0.92
                  ? "absent"
                  : "on_leave";
        } else {
          status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
        }
        const checkIn = new Date(date);
        checkIn.setHours(
          status === "late" ? 9 + Math.floor(Math.random() * 2) : 8,
          Math.floor(Math.random() * 30),
          0,
          0,
        );
        const checkOut = new Date(date);
        checkOut.setHours(
          17 + Math.floor(Math.random() * 2),
          Math.floor(Math.random() * 30),
          0,
          0,
        );

        attendanceRecords.push({
          employeeId: (emp as IEmployee)._id,
          date,
          status,
          checkIn: ["present", "late"].includes(status) ? checkIn : undefined,
          checkOut: ["present", "late"].includes(status) ? checkOut : undefined,
        });
      }
    }

    if (attendanceRecords.length) {
      await Attendance.insertMany(attendanceRecords, { ordered: false }).catch(
        () => {},
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
