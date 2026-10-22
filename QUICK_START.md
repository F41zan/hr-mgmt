# 🚀 Quick Start Guide - HR Management System

## ⚡ Get Started in 3 Minutes

### Step 1: Ensure MongoDB is Running

```bash
# Check if MongoDB is running
mongosh mongodb://localhost:27017/hr-mgmt
```

If not running, start MongoDB service on your system.

---

### Step 2: Start the Development Server

```bash
npm run dev
```

Wait for: `Ready in X seconds`

---

### Step 3: Create Admin User (First Time Only)

```bash
npm run seed:admin
```

**Default Admin Credentials:**

- Email: `admin@gmail.com`
- Password: `admin123`

---

### Step 4: Access the Application

Open your browser and go to:

```
http://localhost:3000
```

Login with admin credentials above.

---

## 🎯 What You Can Do Now

### As Admin/HR:

1. **Manage Employees**
   - Go to "Employees" in navigation
   - Click "Add Employee" to create new employees
   - Edit, view, or deactivate employees

2. **Manage Departments**
   - Go to "Departments"
   - Create departments (e.g., "Engineering", "Sales")
   - Create designations per department

3. **View Attendance**
   - Go to "Attendance"
   - See today's statistics
   - Filter by employee, department, status, date
   - Correct attendance records (with reason)
   - View monthly calendars

4. **Create Users**
   - Go to Admin Dashboard
   - Create user accounts for employees
   - Assign roles (Admin, HR, Employee)

### As Employee:

1. **Mark Attendance**
   - Go to "My Attendance"
   - Click "Check In" when you arrive
   - Click "Check Out" when you leave

2. **View Your Attendance**
   - See your attendance history
   - View monthly calendar
   - Check working hours

---

## 📊 System Status

✅ **All modules working**

- Authentication & RBAC
- Employee Management
- Attendance Management

✅ **Zero compilation errors**

✅ **All dependencies installed**

---

## 🎨 Demo Workflow

### 1. Login as Admin

```
Email: admin@gmail.com
Password: admin123
```

### 2. Create a Department

- Navigate to "Departments"
- Click "Add Department"
- Name: "Engineering"
- Code: "ENG"
- Add designations: "Software Engineer", "Senior Engineer"

### 3. Create an Employee

- Navigate to "Employees"
- Click "Add Employee"
- Fill in details
- Select department: "Engineering"
- Select designation: "Software Engineer"
- Save

### 4. Create User Account for Employee

- Go to Admin Dashboard
- Create user account
- Link to employee
- Set role: "Employee"
- Set password

### 5. Login as Employee (New Tab)

- Use employee credentials
- Go to "My Attendance"
- Click "Check In"
- See real-time clock and status

### 6. View as Admin (Original Tab)

- Go to "Attendance"
- See the employee's check-in record
- View statistics updating in real-time

---

## 🔐 Default Roles & Access

| Role         | Login                      | Access                        |
| ------------ | -------------------------- | ----------------------------- |
| **Admin**    | admin@gmail.com            | Full system access            |
| **HR**       | Create via Admin Dashboard | Manage employees & attendance |
| **Employee** | Create via Admin Dashboard | Own attendance only           |

---

## 📱 Key Pages

| Page                  | URL                        | Access              |
| --------------------- | -------------------------- | ------------------- |
| Login                 | `/`                        | Public              |
| Admin Dashboard       | `/admin/dashboard`         | Admin only          |
| HR Dashboard          | `/hr/dashboard`            | HR only             |
| Employee Dashboard    | `/employee/dashboard`      | Employee only       |
| Employees List        | `/employees`               | Admin, HR           |
| Departments List      | `/departments`             | Admin, HR           |
| Attendance Management | `/attendance`              | Admin, HR           |
| My Attendance         | `/my-attendance`           | All logged-in users |
| Profile               | `/account/profile`         | All logged-in users |
| Change Password       | `/account/change-password` | All logged-in users |

---

## 🔧 Configuration Files

### Environment Variables (`.env.local`)

```env
MONGODB_URI=mongodb://localhost:27017/hr-mgmt
JWT_SECRET=your-secret-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Attendance Policy (`lib/utils/attendance.ts`)

```typescript
standardStartTime: "09:00"; // Work starts at 9 AM
standardEndTime: "18:00"; // Work ends at 6 PM
expectedWorkdayDurationMinutes: 480; // 8 hours
```

---

## 🐛 Troubleshooting

### Issue: "Failed to connect to MongoDB"

**Solution:** Ensure MongoDB is running:

```bash
mongod
```

### Issue: "Cannot login"

**Solution:** Ensure admin user is created:

```bash
npm run seed:admin
```

### Issue: "Port 3000 already in use"

**Solution:** Kill the process or use different port:

```bash
npm run dev -- -p 3001
```

### Issue: "Check-in failed"

**Solution:**

- Ensure employee record exists
- Check employee status is "active"
- Check MongoDB connection

---

## 📖 Documentation

For detailed documentation, see:

- **PROJECT_STATUS.md** - Complete system status
- **IMPLEMENTATION_SUMMARY_COMPLETE.md** - Full technical details
- **ATTENDANCE_COMPLETE.md** - Attendance module guide
- **EMPLOYEE_MANAGEMENT_IMPLEMENTATION.md** - Employee module guide

---

## 🎉 You're All Set!

Your HR Management System is ready to use!

**Next Steps:**

1. ✅ Start MongoDB
2. ✅ Run `npm run dev`
3. ✅ Create admin user
4. ✅ Login and explore
5. ✅ Create departments and employees
6. ✅ Test attendance features

**Need Help?** Check the documentation files or review the code comments.

---

**Happy Managing! 🚀**
