# 📡 API Reference - HR Management System

Complete API documentation for all endpoints in the HR Management System.

---

## 🔐 Authentication

All API endpoints (except `/api/auth/login`) require a valid JWT token in cookies.

### Authentication Headers

```http
Cookie: token=<jwt_token>
```

---

## 📋 Table of Contents

1. [Authentication APIs](#authentication-apis)
2. [Employee Management APIs](#employee-management-apis)
3. [Department Management APIs](#department-management-apis)
4. [Designation Management APIs](#designation-management-apis)
5. [Attendance Management APIs](#attendance-management-apis)
6. [Admin User Management APIs](#admin-user-management-apis)
7. [Dashboard APIs](#dashboard-apis)
8. [Account Management APIs](#account-management-apis)

---

## 🔑 Authentication APIs

### 1. Login

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate user and receive JWT token

**Access:** Public

**Request Body:**

```json
{
  "email": "admin@gmail.com",
  "password": "admin123"
}
```

**Response (200):**

```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "admin@gmail.com",
    "name": "System Admin",
    "role": "admin"
  }
}
```

**Errors:**

- `400` - Invalid email or password
- `401` - Invalid credentials

---

### 2. Logout

**Endpoint:** `POST /api/auth/logout`

**Description:** Clear authentication token

**Access:** Authenticated users

**Response (200):**

```json
{
  "success": true
}
```

---

### 3. Get Current User

**Endpoint:** `GET /api/auth/me`

**Description:** Get currently authenticated user details

**Access:** Authenticated users

**Response (200):**

```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "admin@gmail.com",
  "name": "System Admin",
  "role": "admin"
}
```

**Errors:**

- `401` - Not authenticated

---

### 4. Change Password

**Endpoint:** `POST /api/auth/change-password`

**Description:** Change current user's password

**Access:** Authenticated users

**Request Body:**

```json
{
  "currentPassword": "oldpass123",
  "newPassword": "newpass123"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Errors:**

- `400` - Current password incorrect
- `400` - New password too weak
- `401` - Not authenticated

---

### 5. Forgot Password

**Endpoint:** `POST /api/auth/forgot-password`

**Description:** Request password reset link

**Access:** Public

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Reset link sent to email"
}
```

---

### 6. Reset Password

**Endpoint:** `POST /api/auth/reset-password`

**Description:** Reset password using token

**Access:** Public

**Request Body:**

```json
{
  "token": "reset_token_here",
  "newPassword": "newpass123"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Password reset successful"
}
```

---

## 👥 Employee Management APIs

### 1. List Employees

**Endpoint:** `GET /api/employees`

**Description:** Get paginated list of employees with filters

**Access:** Admin, HR

**Query Parameters:**

- `search` - Search by name, email, or employee ID
- `department` - Filter by department ID
- `designation` - Filter by designation ID
- `status` - Filter by status (`active`, `inactive`)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Example:**

```
GET /api/employees?search=john&department=123&status=active&page=1&limit=20
```

**Response (200):**

```json
{
  "employees": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "employeeId": "EMP001",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "dateOfBirth": "1990-01-15T00:00:00.000Z",
      "gender": "male",
      "address": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA",
      "department": {
        "_id": "dept123",
        "name": "Engineering",
        "code": "ENG"
      },
      "designation": {
        "_id": "desig123",
        "title": "Software Engineer"
      },
      "dateOfJoining": "2023-01-15T00:00:00.000Z",
      "employmentType": "full-time",
      "managerId": {
        "_id": "mgr123",
        "firstName": "Jane",
        "lastName": "Smith",
        "employeeId": "EMP002"
      },
      "salary": 75000,
      "status": "active",
      "createdAt": "2023-01-15T00:00:00.000Z",
      "updatedAt": "2023-01-15T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

### 2. Get Employee by ID

**Endpoint:** `GET /api/employees/[id]`

**Description:** Get single employee details

**Access:** Admin, HR

**Response (200):**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "employeeId": "EMP001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-15T00:00:00.000Z",
  "gender": "male",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "USA",
  "department": {
    "_id": "dept123",
    "name": "Engineering",
    "code": "ENG"
  },
  "designation": {
    "_id": "desig123",
    "title": "Software Engineer"
  },
  "dateOfJoining": "2023-01-15T00:00:00.000Z",
  "employmentType": "full-time",
  "managerId": {
    "_id": "mgr123",
    "firstName": "Jane",
    "lastName": "Smith"
  },
  "salary": 75000,
  "status": "active",
  "createdAt": "2023-01-15T00:00:00.000Z",
  "updatedAt": "2023-01-15T00:00:00.000Z"
}
```

**Errors:**

- `404` - Employee not found
- `403` - Unauthorized

---

### 3. Create Employee

**Endpoint:** `POST /api/employees`

**Description:** Create new employee

**Access:** Admin, HR

**Request Body:**

```json
{
  "employeeId": "EMP001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-15",
  "gender": "male",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "USA",
  "departmentId": "dept123",
  "designationId": "desig123",
  "dateOfJoining": "2023-01-15",
  "employmentType": "full-time",
  "managerId": "mgr123",
  "salary": 75000
}
```

**Response (201):**

```json
{
  "success": true,
  "employee": {
    "_id": "507f1f77bcf86cd799439011",
    "employeeId": "EMP001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "status": "active",
    "createdAt": "2023-01-15T00:00:00.000Z"
  }
}
```

**Errors:**

- `400` - Validation error
- `409` - Employee ID or email already exists
- `403` - Unauthorized

---

### 4. Update Employee

**Endpoint:** `PATCH /api/employees/[id]`

**Description:** Update employee details

**Access:** Admin, HR

**Request Body:** (all fields optional)

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "newemail@example.com",
  "phone": "+1234567890",
  "departmentId": "dept123",
  "designationId": "desig123",
  "salary": 80000,
  "status": "active"
}
```

**Response (200):**

```json
{
  "success": true,
  "employee": {
    "_id": "507f1f77bcf86cd799439011",
    "firstName": "John",
    "lastName": "Doe",
    "updatedAt": "2023-01-15T00:00:00.000Z"
  }
}
```

**Errors:**

- `404` - Employee not found
- `400` - Validation error
- `403` - Unauthorized

---

### 5. Delete Employee

**Endpoint:** `DELETE /api/employees/[id]`

**Description:** Delete/deactivate employee

**Access:** Admin, HR

**Response (200):**

```json
{
  "success": true,
  "message": "Employee deactivated successfully"
}
```

**Errors:**

- `404` - Employee not found
- `403` - Unauthorized

---

## 🏢 Department Management APIs

### 1. List Departments

**Endpoint:** `GET /api/departments`

**Description:** Get all departments with optional filters

**Access:** Admin, HR

**Query Parameters:**

- `search` - Search by name or code
- `status` - Filter by status (`active`, `inactive`)

**Response (200):**

```json
{
  "departments": [
    {
      "_id": "dept123",
      "name": "Engineering",
      "code": "ENG",
      "description": "Software development team",
      "headEmployeeId": {
        "_id": "emp123",
        "firstName": "Jane",
        "lastName": "Smith",
        "employeeId": "EMP002"
      },
      "status": "active",
      "employeeCount": 25,
      "createdAt": "2023-01-15T00:00:00.000Z",
      "updatedAt": "2023-01-15T00:00:00.000Z"
    }
  ]
}
```

---

### 2. Create Department

**Endpoint:** `POST /api/departments`

**Description:** Create new department

**Access:** Admin, HR

**Request Body:**

```json
{
  "name": "Engineering",
  "code": "ENG",
  "description": "Software development team",
  "headEmployeeId": "emp123"
}
```

**Response (201):**

```json
{
  "success": true,
  "department": {
    "_id": "dept123",
    "name": "Engineering",
    "code": "ENG",
    "status": "active",
    "createdAt": "2023-01-15T00:00:00.000Z"
  }
}
```

**Errors:**

- `400` - Validation error
- `409` - Department code already exists
- `403` - Unauthorized

---

### 3. Update Department

**Endpoint:** `PATCH /api/departments/[id]`

**Description:** Update department details

**Access:** Admin, HR

**Request Body:** (all fields optional)

```json
{
  "name": "Engineering Department",
  "description": "Updated description",
  "headEmployeeId": "emp456",
  "status": "active"
}
```

**Response (200):**

```json
{
  "success": true,
  "department": {
    "_id": "dept123",
    "name": "Engineering Department",
    "updatedAt": "2023-01-15T00:00:00.000Z"
  }
}
```

---

### 4. Delete Department

**Endpoint:** `DELETE /api/departments/[id]`

**Description:** Delete/deactivate department

**Access:** Admin, HR

**Response (200):**

```json
{
  "success": true,
  "message": "Department deactivated successfully"
}
```

**Errors:**

- `400` - Cannot delete department with active employees
- `404` - Department not found
- `403` - Unauthorized

---

## 📝 Designation Management APIs

### 1. List Designations

**Endpoint:** `GET /api/designations`

**Description:** Get all designations

**Access:** Admin, HR

**Query Parameters:**

- `departmentId` - Filter by department ID
- `search` - Search by title

**Response (200):**

```json
{
  "designations": [
    {
      "_id": "desig123",
      "title": "Software Engineer",
      "code": "SE",
      "department": {
        "_id": "dept123",
        "name": "Engineering",
        "code": "ENG"
      },
      "description": "Develops software applications",
      "status": "active",
      "employeeCount": 15,
      "createdAt": "2023-01-15T00:00:00.000Z"
    }
  ]
}
```

---

### 2. Create Designation

**Endpoint:** `POST /api/designations`

**Description:** Create new designation

**Access:** Admin, HR

**Request Body:**

```json
{
  "title": "Software Engineer",
  "code": "SE",
  "departmentId": "dept123",
  "description": "Develops software applications"
}
```

**Response (201):**

```json
{
  "success": true,
  "designation": {
    "_id": "desig123",
    "title": "Software Engineer",
    "code": "SE",
    "status": "active",
    "createdAt": "2023-01-15T00:00:00.000Z"
  }
}
```

---

### 3. Update Designation

**Endpoint:** `PATCH /api/designations/[id]`

**Description:** Update designation details

**Access:** Admin, HR

**Request Body:** (all fields optional)

```json
{
  "title": "Senior Software Engineer",
  "description": "Updated description",
  "status": "active"
}
```

**Response (200):**

```json
{
  "success": true,
  "designation": {
    "_id": "desig123",
    "title": "Senior Software Engineer",
    "updatedAt": "2023-01-15T00:00:00.000Z"
  }
}
```

---

### 4. Delete Designation

**Endpoint:** `DELETE /api/designations/[id]`

**Description:** Delete/deactivate designation

**Access:** Admin, HR

**Response (200):**

```json
{
  "success": true,
  "message": "Designation deleted successfully"
}
```

---

## ⏰ Attendance Management APIs

### 1. Check In

**Endpoint:** `POST /api/attendance/check-in`

**Description:** Employee check-in for today

**Access:** All authenticated users

**Request Body:** (empty)

```json
{}
```

**Response (201):**

```json
{
  "success": true,
  "attendance": {
    "_id": "att123",
    "employeeId": "emp123",
    "attendanceDate": "2026-10-22T00:00:00.000Z",
    "checkInAt": "2026-10-22T09:15:00.000Z",
    "isLate": true,
    "lateMinutes": 15,
    "status": "present"
  }
}
```

**Errors:**

- `400` - Already checked in today
- `400` - Employee not found or inactive
- `401` - Not authenticated

---

### 2. Check Out

**Endpoint:** `POST /api/attendance/check-out`

**Description:** Employee check-out for today

**Access:** All authenticated users

**Request Body:** (empty)

```json
{}
```

**Response (200):**

```json
{
  "success": true,
  "attendance": {
    "_id": "att123",
    "employeeId": "emp123",
    "attendanceDate": "2026-10-22T00:00:00.000Z",
    "checkInAt": "2026-10-22T09:15:00.000Z",
    "checkOutAt": "2026-10-22T18:30:00.000Z",
    "workingDurationMinutes": 555,
    "isLate": true,
    "lateMinutes": 15,
    "isEarlyDeparture": false,
    "status": "present"
  }
}
```

**Errors:**

- `400` - Not checked in yet
- `400` - Already checked out
- `401` - Not authenticated

---

### 3. Get My Attendance

**Endpoint:** `GET /api/attendance/me`

**Description:** Get current user's attendance records

**Access:** All authenticated users

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `startDate` - Filter from date (ISO format)
- `endDate` - Filter to date (ISO format)

**Example:**

```
GET /api/attendance/me?page=1&limit=20&startDate=2026-10-01&endDate=2026-10-31
```

**Response (200):**

```json
{
  "attendance": [
    {
      "_id": "att123",
      "attendanceDate": "2026-10-22T00:00:00.000Z",
      "checkInAt": "2026-10-22T09:15:00.000Z",
      "checkOutAt": "2026-10-22T18:30:00.000Z",
      "workingDurationMinutes": 555,
      "isLate": true,
      "lateMinutes": 15,
      "isEarlyDeparture": false,
      "status": "present",
      "notes": "Regular day"
    }
  ],
  "pagination": {
    "total": 20,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 4. List All Attendance

**Endpoint:** `GET /api/attendance`

**Description:** Get all attendance records (filtered)

**Access:** Admin, HR

**Query Parameters:**

- `search` - Search by employee name, ID, email
- `employeeId` - Filter by specific employee
- `departmentId` - Filter by department
- `status` - Filter by status (`present`, `absent`, `half-day`, `on-leave`)
- `startDate` - Filter from date
- `endDate` - Filter to date
- `lateOnly` - Show only late arrivals (`true`/`false`)
- `page` - Page number
- `limit` - Items per page

**Example:**

```
GET /api/attendance?departmentId=dept123&status=present&lateOnly=true&startDate=2026-10-01&page=1&limit=20
```

**Response (200):**

```json
{
  "attendance": [
    {
      "_id": "att123",
      "employee": {
        "_id": "emp123",
        "employeeId": "EMP001",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "department": {
          "name": "Engineering"
        }
      },
      "attendanceDate": "2026-10-22T00:00:00.000Z",
      "checkInAt": "2026-10-22T09:15:00.000Z",
      "checkOutAt": "2026-10-22T18:30:00.000Z",
      "workingDurationMinutes": 555,
      "isLate": true,
      "lateMinutes": 15,
      "status": "present",
      "isManuallyCorrected": false
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### 5. Get Attendance by ID

**Endpoint:** `GET /api/attendance/[id]`

**Description:** Get single attendance record

**Access:** Admin, HR (or own record for employees)

**Response (200):**

```json
{
  "_id": "att123",
  "employee": {
    "_id": "emp123",
    "employeeId": "EMP001",
    "firstName": "John",
    "lastName": "Doe"
  },
  "attendanceDate": "2026-10-22T00:00:00.000Z",
  "checkInAt": "2026-10-22T09:15:00.000Z",
  "checkOutAt": "2026-10-22T18:30:00.000Z",
  "workingDurationMinutes": 555,
  "isLate": true,
  "lateMinutes": 15,
  "isEarlyDeparture": false,
  "status": "present",
  "isManuallyCorrected": false,
  "correctionHistory": [],
  "notes": "Regular day",
  "createdAt": "2026-10-22T09:15:00.000Z",
  "updatedAt": "2026-10-22T18:30:00.000Z"
}
```

---

### 6. Correct Attendance

**Endpoint:** `PATCH /api/attendance/[id]`

**Description:** Correct attendance record with audit trail

**Access:** Admin, HR

**Request Body:**

```json
{
  "checkInAt": "2026-10-22T09:00:00.000Z",
  "checkOutAt": "2026-10-22T18:00:00.000Z",
  "status": "present",
  "reason": "Employee forgot to check in on time, verified with manager"
}
```

**Response (200):**

```json
{
  "success": true,
  "attendance": {
    "_id": "att123",
    "checkInAt": "2026-10-22T09:00:00.000Z",
    "checkOutAt": "2026-10-22T18:00:00.000Z",
    "workingDurationMinutes": 480,
    "isLate": false,
    "status": "present",
    "isManuallyCorrected": true,
    "correctionHistory": [
      {
        "correctedBy": "user123",
        "correctedAt": "2026-10-22T19:00:00.000Z",
        "reason": "Employee forgot to check in on time, verified with manager",
        "previousValues": {
          "checkInAt": "2026-10-22T09:15:00.000Z",
          "isLate": true,
          "lateMinutes": 15
        },
        "newValues": {
          "checkInAt": "2026-10-22T09:00:00.000Z",
          "isLate": false,
          "lateMinutes": 0
        }
      }
    ],
    "updatedAt": "2026-10-22T19:00:00.000Z"
  }
}
```

**Errors:**

- `400` - Reason required (5-500 characters)
- `400` - Check-out before check-in
- `403` - Unauthorized
- `404` - Attendance not found

---

### 7. Get Monthly Calendar

**Endpoint:** `GET /api/attendance/calendar`

**Description:** Get monthly calendar view of attendance

**Access:** Admin, HR (all employees), Employees (own only)

**Query Parameters:**

- `employeeId` - Employee ID (required for Admin/HR)
- `year` - Year (default: current year)
- `month` - Month 1-12 (default: current month)

**Example:**

```
GET /api/attendance/calendar?employeeId=emp123&year=2026&month=10
```

**Response (200):**

```json
{
  "employee": {
    "_id": "emp123",
    "employeeId": "EMP001",
    "firstName": "John",
    "lastName": "Doe"
  },
  "year": 2026,
  "month": 10,
  "attendance": [
    {
      "_id": "att123",
      "attendanceDate": "2026-10-01T00:00:00.000Z",
      "checkInAt": "2026-10-01T09:00:00.000Z",
      "checkOutAt": "2026-10-01T18:00:00.000Z",
      "workingDurationMinutes": 480,
      "isLate": false,
      "status": "present"
    },
    {
      "_id": "att124",
      "attendanceDate": "2026-10-02T00:00:00.000Z",
      "checkInAt": "2026-10-02T09:30:00.000Z",
      "checkOutAt": "2026-10-02T18:00:00.000Z",
      "workingDurationMinutes": 450,
      "isLate": true,
      "lateMinutes": 30,
      "status": "present"
    }
  ],
  "summary": {
    "totalDays": 31,
    "presentDays": 22,
    "absentDays": 0,
    "halfDays": 1,
    "leaveDays": 2,
    "lateDays": 5,
    "totalWorkingMinutes": 10560
  }
}
```

---

### 8. Get Attendance Summary

**Endpoint:** `GET /api/attendance/summary`

**Description:** Get today's attendance statistics

**Access:** Admin, HR

**Query Parameters:**

- `date` - Specific date (default: today, ISO format)

**Example:**

```
GET /api/attendance/summary?date=2026-10-22
```

**Response (200):**

```json
{
  "date": "2026-10-22T00:00:00.000Z",
  "summary": {
    "totalEmployees": 100,
    "present": 85,
    "absent": 10,
    "halfDay": 2,
    "onLeave": 3,
    "late": 15,
    "notCheckedOut": 5,
    "checkedIn": 85,
    "checkedOut": 80
  },
  "departmentWise": [
    {
      "department": "Engineering",
      "present": 25,
      "total": 30
    },
    {
      "department": "Sales",
      "present": 18,
      "total": 20
    }
  ]
}
```

---

## 👔 Admin User Management APIs

### 1. List Users

**Endpoint:** `GET /api/admin/users`

**Description:** Get all user accounts

**Access:** Admin only

**Query Parameters:**

- `search` - Search by name or email
- `role` - Filter by role (`admin`, `hr`, `employee`)

**Response (200):**

```json
{
  "users": [
    {
      "_id": "user123",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "employee",
      "createdAt": "2023-01-15T00:00:00.000Z"
    }
  ]
}
```

---

### 2. Create User

**Endpoint:** `POST /api/admin/users`

**Description:** Create new user account

**Access:** Admin only

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secure123",
  "role": "employee"
}
```

**Response (201):**

```json
{
  "success": true,
  "user": {
    "_id": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "employee",
    "createdAt": "2023-01-15T00:00:00.000Z"
  }
}
```

---

### 3. Update User

**Endpoint:** `PATCH /api/admin/users/[id]`

**Description:** Update user account

**Access:** Admin only

**Request Body:**

```json
{
  "name": "John Updated",
  "role": "hr"
}
```

**Response (200):**

```json
{
  "success": true,
  "user": {
    "_id": "user123",
    "name": "John Updated",
    "role": "hr",
    "updatedAt": "2023-01-15T00:00:00.000Z"
  }
}
```

---

### 4. Delete User

**Endpoint:** `DELETE /api/admin/users/[id]`

**Description:** Delete user account

**Access:** Admin only

**Response (200):**

```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## 📊 Dashboard APIs

### 1. Get Dashboard Summary

**Endpoint:** `GET /api/dashboard/summary`

**Description:** Get dashboard statistics

**Access:** Admin, HR

**Response (200):**

```json
{
  "employees": {
    "total": 100,
    "active": 95,
    "inactive": 5,
    "newThisMonth": 3
  },
  "attendance": {
    "today": {
      "present": 85,
      "absent": 10,
      "late": 15
    },
    "thisMonth": {
      "averagePresent": 90,
      "averageLate": 12
    }
  },
  "departments": {
    "total": 5,
    "active": 5
  },
  "leaves": {
    "pending": 8,
    "approvedThisMonth": 15
  }
}
```

---

## 👤 Account Management APIs

### 1. Get Profile

**Endpoint:** `GET /api/account/profile`

**Description:** Get current user's profile details

**Access:** All authenticated users

**Response (200):**

```json
{
  "user": {
    "_id": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "employee"
  },
  "employee": {
    "_id": "emp123",
    "employeeId": "EMP001",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "department": {
      "name": "Engineering"
    },
    "designation": {
      "title": "Software Engineer"
    },
    "dateOfJoining": "2023-01-15T00:00:00.000Z"
  }
}
```

---

### 2. Update Profile

**Endpoint:** `PATCH /api/account/profile`

**Description:** Update current user's profile

**Access:** All authenticated users

**Request Body:**

```json
{
  "name": "John Updated",
  "phone": "+1234567890"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

---

## ❌ Error Response Format

All errors follow this format:

```json
{
  "error": "Error message here",
  "details": "Additional details if available"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (no permission)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

---

## 🔐 Role-Based Access Summary

| Endpoint Category      | Admin | HR  | Employee |
| ---------------------- | ----- | --- | -------- |
| Authentication         | ✅    | ✅  | ✅       |
| Employee Management    | ✅    | ✅  | ❌       |
| Department Management  | ✅    | ✅  | ❌       |
| Designation Management | ✅    | ✅  | ❌       |
| Attendance (Own)       | ✅    | ✅  | ✅       |
| Attendance (All)       | ✅    | ✅  | ❌       |
| Attendance Correction  | ✅    | ✅  | ❌       |
| User Management        | ✅    | ❌  | ❌       |
| Dashboard              | ✅    | ✅  | ✅\*     |

\* Employees see limited dashboard with own data only

---

## 📝 Notes

1. All timestamps are in ISO 8601 format
2. Dates are stored in UTC
3. Business timezone: Asia/Kolkata (configured in attendance utils)
4. Pagination default: 20 items per page
5. Pagination maximum: 100 items per page
6. JWT tokens expire after 7 days (configurable)
7. Passwords are hashed with bcrypt (10 rounds)
8. MongoDB unique indexes prevent duplicate records

---

**API Reference Complete** ✅

For usage examples and workflows, see `QUICK_START.md` and `IMPLEMENTATION_SUMMARY_COMPLETE.md`.
