/**
 * __tests__/roles.test.ts
 * Tests for central role definitions and dashboard routing.
 */

import { ROLES, ROLE_VALUES, ROLE_DASHBOARD } from "@/lib/roles";

describe("ROLES enum", () => {
  it("defines admin, hr, and employee roles", () => {
    expect(ROLES.ADMIN).toBe("admin");
    expect(ROLES.HR).toBe("hr");
    expect(ROLES.EMPLOYEE).toBe("employee");
  });

  it("ROLE_VALUES contains exactly three values", () => {
    expect(ROLE_VALUES).toHaveLength(3);
    expect(ROLE_VALUES).toContain("admin");
    expect(ROLE_VALUES).toContain("hr");
    expect(ROLE_VALUES).toContain("employee");
  });
});

describe("ROLE_DASHBOARD", () => {
  it("maps admin to /admin/dashboard", () => {
    expect(ROLE_DASHBOARD.admin).toBe("/admin/dashboard");
  });

  it("maps hr to /hr/dashboard", () => {
    expect(ROLE_DASHBOARD.hr).toBe("/hr/dashboard");
  });

  it("maps employee to /employee/dashboard", () => {
    expect(ROLE_DASHBOARD.employee).toBe("/employee/dashboard");
  });

  it("does not include any unknown roles", () => {
    const keys = Object.keys(ROLE_DASHBOARD);
    expect(keys).toEqual(expect.arrayContaining(["admin", "hr", "employee"]));
    expect(keys).toHaveLength(3);
  });
});
