# Dashboard Implementation Test Checklist

Use this checklist to verify the complete dashboard functionality.

## ✅ Pre-Test Setup

- [ ] MongoDB is running on `localhost:27017` or your configured connection string
- [ ] `.env.local` file contains valid `MONGODB_URI` and `JWT_SECRET`
- [ ] Dependencies installed: `npm install`
- [ ] Development server running: `npm run dev`
- [ ] Demo data has been seeded automatically (check console for "Seeding demo HR data…")

---

## 🔐 Test 1: Authentication & Access Control

### Admin Access

- [ ] Login with `admin@company.com` / `Admin@123`
- [ ] Navigate to `/admin/dashboard`
- [ ] Page loads without errors
- [ ] Can see "Admin Dashboard" header
- [ ] User name displayed in header greeting
- [ ] NavBar shows profile menu with admin role

### HR Access

- [ ] Login with `sarah.johnson@company.com` / `Pass@123`
- [ ] Navigate to `/hr/dashboard`
- [ ] Page loads without errors
- [ ] Can see "HR Dashboard" header
- [ ] Cannot access `/admin/dashboard` (should redirect/forbidden)

### Employee Access

- [ ] Login with `james.wilson@company.com` / `Pass@123`
- [ ] Navigate to `/employee/dashboard`
- [ ] Page loads without errors
- [ ] Can see "My Dashboard" header
- [ ] Cannot access `/admin/dashboard` or `/hr/dashboard`

---

## 📊 Test 2: Admin Dashboard Components

### Employee Statistics Section

- [ ] "Workforce Overview" section header visible
- [ ] "Total Employees" card shows count > 0
- [ ] "Active" card shows count
- [ ] "Inactive" card shows count
- [ ] "On Leave" card shows count
- [ ] "New This Month" card shows count with subtitle
- [ ] All cards have appropriate colored icons

### Today's Attendance Section

- [ ] "Today's Attendance" section header visible
- [ ] "Attendance Rate" card shows percentage
- [ ] "Present" card shows count
- [ ] "Late Arrivals" card shows count
- [ ] "Absent" card shows count
- [ ] "On Leave Today" card shows count
- [ ] Attendance rate calculation appears reasonable

### Leave Summary Section

- [ ] "Leave Summary" section header visible
- [ ] "Pending Requests" card shows count
- [ ] "Approved" card shows count
- [ ] "Rejected" card shows count
- [ ] "Currently on Leave" card shows count

### Charts Section

- [ ] Attendance trend chart displays
- [ ] Chart has 7d/14d/30d toggle buttons
- [ ] Clicking range buttons updates chart
- [ ] Chart shows stacked bars with legend
- [ ] Department distribution chart displays
- [ ] Department chart shows multiple departments
- [ ] Percentages add up correctly

### Pending Leaves Table

- [ ] Table header "Pending Leave Requests" visible
- [ ] Table shows employee name, ID, department
- [ ] Shows leave type, dates, days, status
- [ ] "Approve" and "Reject" buttons visible (if canReview=true)
- [ ] Clicking approve/reject updates the UI
- [ ] Table shows empty state if no pending leaves

### Recent Activity

- [ ] "Recent Activity" section displays
- [ ] Shows leave submission/approval events
- [ ] Each item has timestamp
- [ ] Shows empty state if no activity

### Upcoming Events

- [ ] "Upcoming Events" section displays
- [ ] Shows birthdays and anniversaries (if any)
- [ ] Shows days away for each event
- [ ] Sorted by nearest date first

### Quick Actions

- [ ] Quick Actions section displays
- [ ] "Add Employee" action visible for admin
- [ ] "Manage Users" action visible for admin
- [ ] "View Employees" action visible
- [ ] "Leave Requests" action visible
- [ ] "My Profile" action visible
- [ ] "Change Password" action visible
- [ ] Clicking actions navigates to correct pages

### User Management Section (Admin Only)

- [ ] "User Account Management" section visible at bottom
- [ ] AdminUserTable displays below dashboard
- [ ] Can create new HR/Employee accounts
- [ ] List of existing users shown

---

## 👨‍💼 Test 3: HR Dashboard Components

### HR Dashboard Access

- [ ] Login as HR user
- [ ] Navigate to `/hr/dashboard`
- [ ] See "HR Dashboard" header

### Statistics Sections

- [ ] "Workforce Overview" section displays
- [ ] "Today's Attendance" section displays
- [ ] "Leave Summary" section displays
- [ ] All cards show correct data

### Charts & Tables

- [ ] Attendance trend chart displays with filters
- [ ] Department distribution chart displays
- [ ] Pending leaves table displays
- [ ] Can approve/reject leaves (if HR has permission)

### Recent Activity & Events

- [ ] Recent activity section displays
- [ ] Upcoming events section displays

### Quick Actions (HR)

- [ ] Quick actions section displays
- [ ] NO "Add Employee" or "Manage Users" actions (admin-only)
- [ ] "View Employees" action visible
- [ ] "Leave Requests" action visible
- [ ] "My Profile" action visible
- [ ] "Change Password" action visible

### No Admin Features

- [ ] NO User Management section at bottom (admin-only)
- [ ] Cannot access admin-specific functionality

---

## 👤 Test 4: Employee Dashboard Components

### Employee Dashboard Access

- [ ] Login as employee
- [ ] Navigate to `/employee/dashboard`
- [ ] See "My Dashboard" header

### Employee Info Banner

- [ ] Large profile initial circle displays
- [ ] Employee name displayed
- [ ] Designation and department shown
- [ ] Employee ID shown
- [ ] Today's attendance status badge shown

### Attendance Statistics

- [ ] "Attendance Rate" card shows percentage (last 30 days)
- [ ] "Days Present" card shows count
- [ ] "Days Late" card shows count
- [ ] "Days Absent" card shows count

### Leave Statistics

- [ ] "Pending Requests" card shows count
- [ ] "Approved Leaves" card shows count
- [ ] "Rejected" card shows count

### Quick Actions (Employee)

- [ ] "View Attendance" action visible
- [ ] "Apply for Leave" action visible
- [ ] "View Profile" action visible
- [ ] "Change Password" action visible
- [ ] NO admin or HR actions visible

### Recent Attendance Table

- [ ] "Recent Attendance" table displays (if records exist)
- [ ] Shows date, status, check-in, check-out
- [ ] Recent 10 records shown
- [ ] Status badges colored correctly

### My Leave Requests Table

- [ ] "My Leave Requests" table displays (if leaves exist)
- [ ] Shows type, period, days, status, reason
- [ ] Recent 5 requests shown
- [ ] Status badges colored correctly

### No Organization Data

- [ ] Cannot see other employees' data
- [ ] Cannot see organization-wide statistics
- [ ] Cannot approve/reject leave requests
- [ ] No department distribution visible

---

## 🎨 Test 5: UI/UX & Responsiveness

### Loading States

- [ ] Dashboard shows skeleton loader on initial load
- [ ] Changing date range shows loading indicator on chart
- [ ] Smooth transitions between loading and loaded states

### Error Handling

- [ ] If API fails, error message displays
- [ ] Error state shows retry button
- [ ] Retry button reloads data successfully

### Empty States

- [ ] If no data available, appropriate empty states shown
- [ ] Empty state messages are clear and helpful

### Responsive Design

- [ ] Desktop (>1024px): Multi-column grid layouts work
- [ ] Tablet (768-1023px): Responsive grid adjusts
- [ ] Mobile (<768px): Single column, stacks correctly
- [ ] Tables scroll horizontally on small screens
- [ ] Charts scale appropriately
- [ ] Navigation works on all screen sizes

### Theme Consistency

- [ ] All cards have white background
- [ ] Page background is light blue (#EFF6FF)
- [ ] Primary blue color (#2563EB) used consistently
- [ ] Icons are clear and visible
- [ ] Text is readable with good contrast
- [ ] Hover states work on interactive elements

### Status Badges

- [ ] "Present" badge is green
- [ ] "Late" badge is yellow/orange
- [ ] "Absent" badge is red
- [ ] "On Leave" badge is purple
- [ ] "Pending" badge is yellow
- [ ] "Approved" badge is green
- [ ] "Rejected" badge is red

---

## 📈 Test 6: Data Accuracy

### Employee Counts

- [ ] Total employees matches database count
- [ ] Active + Inactive = Total (approximately)
- [ ] Numbers are consistent across refreshes

### Attendance Calculations

- [ ] Today's attendance rate = (present + late) / active employees \* 100
- [ ] Present + Late + Absent + OnLeave ≤ Active Employees
- [ ] Numbers make logical sense

### Leave Calculations

- [ ] Pending + Approved + Rejected = Total Requests
- [ ] "Currently on Leave" ≤ Approved Leaves
- [ ] Numbers are internally consistent

### Department Distribution

- [ ] All departments shown
- [ ] Counts add up to active employees
- [ ] Percentages add up to ~100%

### Date Handling

- [ ] Dates formatted correctly (e.g., "Feb 22")
- [ ] Timestamps show reasonable times
- [ ] No timezone confusion in displayed dates

---

## 🔄 Test 7: Interactive Features

### Attendance Trend Chart

- [ ] Click "7d" button - chart updates to 7 days
- [ ] Click "14d" button - chart updates to 14 days
- [ ] Click "30d" button - chart updates to 30 days
- [ ] Active button highlighted
- [ ] Chart redraws smoothly

### Leave Actions (Admin/HR)

- [ ] Click "Approve" on pending leave
- [ ] Success feedback appears
- [ ] Leave disappears from pending table
- [ ] Leave counts update correctly
- [ ] Recent activity shows approval
- [ ] Click "Reject" on another pending leave
- [ ] Works similarly to approve

### Quick Action Navigation

- [ ] Clicking quick action cards navigates correctly
- [ ] Links open the expected pages
- [ ] No broken links
- [ ] Back button returns to dashboard

### Profile Menu (NavBar)

- [ ] Click profile dropdown in NavBar
- [ ] Shows user name and role
- [ ] Has logout option
- [ ] Logout works correctly

---

## 🔒 Test 8: Security & Authorization

### API Authorization

- [ ] Cannot access `/api/dashboard/summary` without login
- [ ] Employee cannot see org-wide data in API response
- [ ] HR cannot approve leaves without permission
- [ ] Attempting to manipulate role in browser fails

### Route Protection

- [ ] Employee redirected from `/admin/dashboard`
- [ ] HR redirected from `/admin/dashboard` (if not allowed)
- [ ] Unauthenticated user redirected to login
- [ ] All protected routes enforce authentication

### Data Isolation

- [ ] Employee A cannot see Employee B's attendance
- [ ] Employee cannot see salary information (if implemented)
- [ ] HR cannot access admin-only functions
- [ ] Role is verified server-side, not client-side

---

## 🚀 Test 9: Performance

### Initial Load Time

- [ ] Dashboard loads within 2-3 seconds on first visit
- [ ] Subsequent loads are faster (cached data)

### Data Fetching

- [ ] Single API call fetches all dashboard data
- [ ] No unnecessary duplicate requests
- [ ] Loading indicators show during fetch

### Chart Rendering

- [ ] Charts render smoothly without lag
- [ ] Date range changes are responsive
- [ ] No flickering during updates

### Large Data Sets

- [ ] Dashboard handles 100+ employees gracefully
- [ ] Tables paginate or scroll when needed
- [ ] No browser freezing with large data

---

## 🐛 Test 10: Edge Cases

### No Data Scenarios

- [ ] New employee with no attendance: Shows "not_recorded"
- [ ] Employee with no leave requests: Shows 0 counts
- [ ] Department with 0 employees: Handles gracefully
- [ ] Empty activity feed: Shows empty state

### Boundary Conditions

- [ ] Employee with 0% attendance rate: Displays correctly
- [ ] Employee with 100% attendance rate: Displays correctly
- [ ] Leave spanning month boundary: Calculated correctly
- [ ] Birthday/anniversary today: Shows "0 days away"

### Invalid Operations

- [ ] Approving already-approved leave: Should fail gracefully
- [ ] Rejecting already-rejected leave: Should fail gracefully
- [ ] Accessing non-existent leave ID: Shows error
- [ ] Invalid date range: Falls back to default

### Concurrent Actions

- [ ] Two admins approving same leave: One succeeds, one fails
- [ ] Rapid clicking approve button: Only processes once
- [ ] Multiple dashboard refreshes: Data stays consistent

---

## 📝 Test Results Summary

Total Tests: ~150+ individual checks

### Pass/Fail Count

- Passed: **\_** / ~150
- Failed: **\_** / ~150
- Skipped: **\_** / ~150

### Critical Issues Found

1.
2.
3.

### Minor Issues Found

1.
2.
3.

### Notes

-
-
-

---

## ✅ Sign-Off

**Tester Name:** **********\_**********

**Date:** **********\_**********

**Overall Status:** ☐ Pass ☐ Fail ☐ Pass with Minor Issues

**Recommendation:** ☐ Production Ready ☐ Needs Fixes ☐ Major Rework Required

**Comments:**
