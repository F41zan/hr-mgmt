# ✅ Testing Checklist - HR Management System

Complete testing checklist to verify all features before production deployment.

---

## 🔐 Authentication & Authorization Tests

### Login Tests

- [ ] Login with valid Admin credentials
- [ ] Login with valid HR credentials
- [ ] Login with valid Employee credentials
- [ ] Login with invalid email shows error
- [ ] Login with invalid password shows error
- [ ] Login with non-existent user shows error
- [ ] JWT token is set in cookies after successful login
- [ ] User is redirected to correct dashboard based on role

### Logout Tests

- [ ] Logout clears token cookie
- [ ] Logout redirects to login page
- [ ] After logout, accessing protected pages redirects to login

### Role-Based Access Tests

- [ ] Admin can access all pages
- [ ] HR can access HR-allowed pages
- [ ] HR cannot access Admin-only pages
- [ ] Employee can access own pages only
- [ ] Employee cannot access Admin/HR pages
- [ ] Direct URL access to unauthorized pages is blocked

### Password Management Tests

- [ ] Change password with correct current password works
- [ ] Change password with incorrect current password fails
- [ ] Forgot password sends reset link (or logs to console in dev)
- [ ] Reset password with valid token works
- [ ] Reset password with expired token fails

---

## 👥 Employee Management Tests

### List Employees Tests

- [ ] All employees display in table
- [ ] Pagination works correctly
- [ ] Search by name filters results
- [ ] Search by employee ID filters results
- [ ] Search by email filters results
- [ ] Department filter works
- [ ] Designation filter works
- [ ] Status filter (active/inactive) works
- [ ] Combining multiple filters works
- [ ] Reset filters clears all filters
- [ ] Employee count is accurate

### Create Employee Tests

- [ ] Create employee with all required fields succeeds
- [ ] Create employee with duplicate employee ID fails
- [ ] Create employee with duplicate email fails
- [ ] Create employee with invalid email format fails
- [ ] Create employee with future date of birth fails
- [ ] Create employee with future joining date warns user
- [ ] Department dropdown loads correctly
- [ ] Designation dropdown filters by department
- [ ] Manager dropdown loads active employees
- [ ] Created employee appears in list immediately
- [ ] Success message displays after creation

### View Employee Tests

- [ ] Click on employee opens detail page
- [ ] All employee information displays correctly
- [ ] Department name displays (not just ID)
- [ ] Designation title displays (not just ID)
- [ ] Manager name displays if assigned
- [ ] Profile picture displays or shows placeholder
- [ ] Employee status badge shows correct color
- [ ] Back button returns to list

### Edit Employee Tests

- [ ] Edit employee modal/page opens
- [ ] Form pre-fills with existing data
- [ ] Update first name saves successfully
- [ ] Update email saves successfully
- [ ] Update email to duplicate email fails
- [ ] Update department updates designation options
- [ ] Update salary saves successfully
- [ ] Change status to inactive works
- [ ] Updated data reflects immediately
- [ ] Edit history/audit trail if implemented

### Delete/Deactivate Employee Tests

- [ ] Deactivate employee changes status to inactive
- [ ] Deactivated employee doesn't appear in active filter
- [ ] Deactivated employee appears in inactive filter
- [ ] Deactivated employee cannot check in/out
- [ ] Reactivate employee works
- [ ] Cannot delete employee with attendance records (if enforced)

---

## 🏢 Department Management Tests

### List Departments Tests

- [ ] All departments display
- [ ] Search by name works
- [ ] Search by code works
- [ ] Status filter works
- [ ] Employee count per department is accurate
- [ ] Department head name displays

### Create Department Tests

- [ ] Create department with required fields succeeds
- [ ] Create department with duplicate code fails
- [ ] Department code auto-uppercases or validates format
- [ ] Select department head from employees
- [ ] Created department appears in list
- [ ] Created department appears in employee form dropdown

### Edit Department Tests

- [ ] Edit department modal opens
- [ ] Update department name works
- [ ] Update description works
- [ ] Change department head works
- [ ] Cannot change code if employees exist (if enforced)
- [ ] Updates reflect immediately

### Delete Department Tests

- [ ] Cannot delete department with active employees
- [ ] Can delete department with no employees
- [ ] Deactivate department works
- [ ] Deactivated department doesn't appear in active filters

### Designation Tests (within Department)

- [ ] Add designation to department works
- [ ] Edit designation title works
- [ ] Delete designation with no employees works
- [ ] Cannot delete designation with active employees
- [ ] Designations filter by department in employee form

---

## ⏰ Attendance Management Tests

### Employee Check-In Tests

- [ ] Employee can check in for today
- [ ] Check-in time is recorded accurately
- [ ] Check-in after 9:00 AM flags as late
- [ ] Late minutes calculated correctly
- [ ] Cannot check in twice on same day
- [ ] Inactive employee cannot check in
- [ ] Real-time clock displays current time
- [ ] Today's status card updates after check-in
- [ ] Success message displays

### Employee Check-Out Tests

- [ ] Employee can check out after checking in
- [ ] Check-out time is recorded accurately
- [ ] Working duration calculated correctly
- [ ] Status changes to "Present" if > 8 hours
- [ ] Status shows "Half-day" if 4-8 hours
- [ ] Check-out before 6:00 PM flags early departure
- [ ] Cannot check out before checking in
- [ ] Cannot check out twice
- [ ] Today's status card updates after check-out

### My Attendance (Employee View) Tests

- [ ] Employee sees only own attendance records
- [ ] Today's record shows at top
- [ ] Attendance history displays with pagination
- [ ] Dates, times, duration show correctly
- [ ] Status badges show correct colors
- [ ] Late badge displays if late
- [ ] Monthly view works
- [ ] Cannot see other employees' attendance

### Admin/HR Attendance Management Tests

- [ ] View all employees' attendance
- [ ] Today's summary cards show correct counts
- [ ] Present count is accurate
- [ ] Absent count is accurate (if tracked)
- [ ] Late arrivals count is accurate
- [ ] Missing checkouts count is accurate

### Attendance Filters Tests

- [ ] Search by employee name works
- [ ] Search by employee ID works
- [ ] Department filter works
- [ ] Employee dropdown filter works
- [ ] Status filter (present/absent/half-day/leave) works
- [ ] Date range filter works
- [ ] "Late Arrivals Only" checkbox works
- [ ] Combining multiple filters works
- [ ] Reset filters clears all selections
- [ ] Filtered results count updates

### Attendance Correction Tests

- [ ] Click edit icon opens correction modal
- [ ] Current values display correctly
- [ ] Can modify check-in time
- [ ] Can modify check-out time
- [ ] Can change status
- [ ] Reason field is required
- [ ] Reason must be 5-500 characters
- [ ] Check-out before check-in is rejected
- [ ] Correction saves successfully
- [ ] Recalculated values (duration, late, status) update
- [ ] Audit trail entry is created
- [ ] Previous values saved in correction history
- [ ] Corrected by user ID is saved
- [ ] Correction timestamp is saved
- [ ] "Manually Corrected" badge displays
- [ ] View correction history works

### Monthly Calendar Tests

- [ ] Click calendar icon opens modal
- [ ] Calendar displays for selected employee
- [ ] Current month loads by default
- [ ] Previous month button works
- [ ] Next month button works
- [ ] Days with attendance show colored
- [ ] Present = Green
- [ ] Absent = Red (if tracked)
- [ ] Half-day = Yellow
- [ ] Leave = Blue
- [ ] Late arrival has indicator
- [ ] Click day shows details
- [ ] Monthly summary statistics are accurate
- [ ] Total present days correct
- [ ] Total late days correct
- [ ] Total working hours correct

### Attendance Summary Tests

- [ ] Dashboard shows today's summary
- [ ] Total employees count correct
- [ ] Present today count correct
- [ ] Late today count correct
- [ ] Department-wise breakdown works
- [ ] Summary updates when attendance changes

---

## 👔 Admin User Management Tests

### List Users Tests (Admin Only)

- [ ] Admin sees all user accounts
- [ ] Search by name works
- [ ] Search by email works
- [ ] Role filter works
- [ ] User count is accurate
- [ ] Non-admin cannot access

### Create User Tests (Admin Only)

- [ ] Create Admin user works
- [ ] Create HR user works
- [ ] Create Employee user works
- [ ] Duplicate email is rejected
- [ ] Weak password is rejected
- [ ] Created user can login
- [ ] Created user has correct role permissions

### Edit User Tests (Admin Only)

- [ ] Change user name works
- [ ] Change user role works
- [ ] Role change updates permissions immediately
- [ ] Cannot change own role (if enforced)

### Delete User Tests (Admin Only)

- [ ] Delete user account works
- [ ] Deleted user cannot login
- [ ] Cannot delete own account (if enforced)
- [ ] Confirmation modal displays

---

## 📊 Dashboard Tests

### Admin Dashboard

- [ ] Dashboard loads without errors
- [ ] Total employees card shows correct count
- [ ] Active employees count correct
- [ ] Today's attendance summary correct
- [ ] Recent employees list displays
- [ ] Quick action buttons work
- [ ] Charts/graphs display (if implemented)

### HR Dashboard

- [ ] HR sees allowed statistics
- [ ] Quick actions for HR tasks work
- [ ] Recent activity displays
- [ ] Pending approvals show (if leave module exists)

### Employee Dashboard

- [ ] Employee sees own summary only
- [ ] Today's attendance status shows
- [ ] Quick check-in button works
- [ ] Upcoming leaves display (if leave module exists)
- [ ] Recent attendance history shows

---

## 👤 Account/Profile Tests

### View Profile Tests

- [ ] Current user's profile displays
- [ ] User information correct
- [ ] Employee information displays (if linked)
- [ ] Department and designation show
- [ ] Profile picture displays or placeholder

### Edit Profile Tests

- [ ] Edit profile modal/page opens
- [ ] Update name works
- [ ] Update phone works
- [ ] Update profile picture works (if implemented)
- [ ] Cannot change email (if enforced)
- [ ] Updates save successfully

### Change Password Tests

- [ ] Change password page accessible
- [ ] Current password required
- [ ] New password must meet requirements
- [ ] Confirm password must match
- [ ] Success message after change
- [ ] Can login with new password
- [ ] Cannot login with old password

---

## 🎨 UI/UX Tests

### Responsive Design Tests

- [ ] Layout works on mobile (< 768px)
- [ ] Layout works on tablet (768-1023px)
- [ ] Layout works on desktop (>= 1024px)
- [ ] Navigation adapts to screen size
- [ ] Tables scroll horizontally on mobile
- [ ] Modals fit on mobile screens
- [ ] Forms are usable on mobile
- [ ] Buttons are touch-friendly

### Theme & Styling Tests

- [ ] White and light blue theme consistent
- [ ] Primary blue color (#2563EB) used correctly
- [ ] Status colors correct (green/red/yellow/blue)
- [ ] Hover states work
- [ ] Focus states visible for accessibility
- [ ] Loading spinners display during operations
- [ ] Success messages display and auto-dismiss
- [ ] Error messages display clearly
- [ ] Empty states show when no data

### Navigation Tests

- [ ] Navbar displays correctly
- [ ] Role-based links show for correct roles
- [ ] Active page highlighted in nav
- [ ] Logo/brand link goes to dashboard
- [ ] Profile link works
- [ ] Logout link works
- [ ] Breadcrumbs work (if implemented)
- [ ] Back buttons work correctly

### Form Validation Tests

- [ ] Required fields show error when empty
- [ ] Email fields validate format
- [ ] Number fields only accept numbers
- [ ] Date fields validate reasonable dates
- [ ] Phone fields validate format
- [ ] Validation errors clear when corrected
- [ ] Submit button disabled during submission
- [ ] Success/error messages display

---

## 🔒 Security Tests

### Authentication Security

- [ ] Passwords are hashed (not stored plain)
- [ ] JWT tokens expire appropriately
- [ ] Invalid tokens are rejected
- [ ] Expired tokens require re-login
- [ ] No sensitive data in JWT payload

### Authorization Security

- [ ] API endpoints check authentication
- [ ] API endpoints enforce role permissions
- [ ] Direct API calls without auth fail
- [ ] Employee cannot access admin APIs
- [ ] URL tampering doesn't bypass security
- [ ] CSRF protection in place (if applicable)

### Data Security

- [ ] SQL/NoSQL injection attempts fail
- [ ] XSS attempts are escaped
- [ ] File upload validates types (if implemented)
- [ ] Sensitive data not logged
- [ ] Error messages don't leak sensitive info

---

## 📊 Data Integrity Tests

### Database Tests

- [ ] Duplicate employee IDs prevented
- [ ] Duplicate emails prevented
- [ ] Duplicate department codes prevented
- [ ] Duplicate daily attendance prevented
- [ ] Foreign key relationships maintained
- [ ] Cascade deletes work correctly (if implemented)
- [ ] Indexes created for performance

### Calculation Tests

- [ ] Working hours calculated accurately
- [ ] Late minutes calculated correctly
- [ ] Early departure minutes correct
- [ ] Half-day threshold (4 hours) applied correctly
- [ ] Present threshold (8 hours) applied correctly
- [ ] Timezone conversions correct

### Audit Trail Tests

- [ ] Attendance corrections save history
- [ ] Correction history includes who/when/why
- [ ] Previous values preserved
- [ ] Cannot delete correction history
- [ ] Audit trail displays in UI

---

## ⚡ Performance Tests

### Page Load Tests

- [ ] Dashboard loads in < 2 seconds
- [ ] Employee list loads in < 2 seconds
- [ ] Attendance list loads in < 2 seconds
- [ ] Large tables paginate efficiently
- [ ] No unnecessary re-renders

### API Performance Tests

- [ ] List endpoints return in < 500ms
- [ ] Single record endpoints return in < 200ms
- [ ] Create/update operations complete in < 1s
- [ ] Filtered queries perform well
- [ ] Pagination queries efficient

### Database Performance Tests

- [ ] Indexes exist on foreign keys
- [ ] Indexes exist on search fields
- [ ] Compound indexes for common queries
- [ ] Large datasets don't slow queries
- [ ] Connection pooling configured

---

## 🐛 Error Handling Tests

### Network Error Tests

- [ ] Lost connection shows error
- [ ] Timeout shows error message
- [ ] Retry mechanism works (if implemented)
- [ ] Offline mode handles gracefully (if implemented)

### Server Error Tests

- [ ] 500 errors show user-friendly message
- [ ] Database connection errors handled
- [ ] MongoDB errors don't crash app
- [ ] Error boundaries catch React errors

### User Error Tests

- [ ] Invalid form input shows clear message
- [ ] Permission denied shows clear message
- [ ] Not found (404) shows helpful page
- [ ] Concurrent edit conflicts handled

---

## 📱 Browser Compatibility Tests

- [ ] Works in Chrome (latest)
- [ ] Works in Firefox (latest)
- [ ] Works in Safari (latest)
- [ ] Works in Edge (latest)
- [ ] Works in mobile browsers
- [ ] CSS displays correctly in all browsers
- [ ] JavaScript functions in all browsers

---

## 🚀 Pre-Production Checklist

### Configuration

- [ ] Environment variables set correctly
- [ ] MongoDB URI points to production database
- [ ] JWT_SECRET is strong and secure
- [ ] NEXT_PUBLIC_APP_URL set to production URL
- [ ] NODE_ENV=production
- [ ] Email service configured (if used)

### Database

- [ ] MongoDB indexes created
- [ ] Database backup configured
- [ ] Connection pooling configured
- [ ] Replica set configured (recommended)

### Security

- [ ] HTTPS enabled
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Default admin password changed
- [ ] All test accounts removed

### Monitoring

- [ ] Error logging configured (Sentry, etc.)
- [ ] Performance monitoring setup
- [ ] Uptime monitoring configured
- [ ] Database monitoring enabled
- [ ] Alerts configured for critical issues

### Documentation

- [ ] API documentation complete
- [ ] User manual created
- [ ] Admin guide created
- [ ] Deployment guide created
- [ ] Backup/restore procedures documented

---

## 📝 Test Results Summary

**Date:** ******\_******

**Tester:** ******\_******

### Module Status

| Module                | Passed    | Failed | Notes  |
| --------------------- | --------- | ------ | ------ |
| Authentication        | **_ / _** | \_\_\_ | **\_** |
| Employee Management   | **_ / _** | \_\_\_ | **\_** |
| Department Management | **_ / _** | \_\_\_ | **\_** |
| Attendance Management | **_ / _** | \_\_\_ | **\_** |
| Admin User Management | **_ / _** | \_\_\_ | **\_** |
| Dashboard             | **_ / _** | \_\_\_ | **\_** |
| Profile/Account       | **_ / _** | \_\_\_ | **\_** |
| UI/UX                 | **_ / _** | \_\_\_ | **\_** |
| Security              | **_ / _** | \_\_\_ | **\_** |
| Performance           | **_ / _** | \_\_\_ | **\_** |

### Overall Status

- **Total Tests:** ****\_\_\_****
- **Passed:** ****\_\_\_****
- **Failed:** ****\_\_\_****
- **Pass Rate:** ****\_\_\_****%

### Critical Issues

1. ***
2. ***
3. ***

### Non-Critical Issues

1. ***
2. ***
3. ***

### Recommendation

☐ **APPROVED** for production deployment  
☐ **NEEDS WORK** - address critical issues first  
☐ **REJECTED** - major issues found

---

## 🎯 Testing Tips

1. **Test as different users** - Login as Admin, HR, and Employee separately
2. **Use real data** - Test with realistic names, dates, and scenarios
3. **Test edge cases** - Empty states, maximum values, special characters
4. **Test error scenarios** - Invalid inputs, network failures, permission denied
5. **Test on different devices** - Desktop, tablet, mobile
6. **Test in different browsers** - Chrome, Firefox, Safari, Edge
7. **Test concurrent users** - Multiple users performing actions simultaneously
8. **Document everything** - Screenshot bugs, note reproduction steps
9. **Retest after fixes** - Verify bug fixes don't break other features
10. **Load test** - Test with expected production data volume

---

## 📞 Reporting Issues

When reporting issues, include:

1. **What you did** - Steps to reproduce
2. **What you expected** - Expected behavior
3. **What happened** - Actual behavior
4. **Environment** - Browser, device, user role
5. **Screenshot** - Visual evidence if applicable
6. **Console errors** - Browser console logs
7. **Severity** - Critical, High, Medium, Low

---

**Testing Checklist Complete** ✅

Use this checklist systematically before production deployment to ensure all features work correctly!
