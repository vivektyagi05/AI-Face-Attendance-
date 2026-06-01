# API Flow Examples — Smart Attendance Platform

All examples use `curl`. Replace `TOKEN` with the JWT received from `/auth/login`.

---

## 🔄 Complete Workflow: From Zero to Attendance

---

### STEP 1 — Admin Login

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@smartattendance.com",
    "password": "Admin@123456"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": {
      "_id": "65a1b2c3d4e5f6a7b8c9d0e1",
      "name": "System Administrator",
      "email": "admin@smartattendance.com",
      "role": "admin",
      "mustChangePassword": false
    }
  }
}
```

> Save the `token` – you'll use it in every subsequent request as:
> `Authorization: Bearer <token>`

---

### STEP 2 — Admin Changes Password

```bash
curl -X POST http://localhost:5000/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "currentPassword": "Admin@123456",
    "newPassword": "MySecure@Pass99",
    "confirmPassword": "MySecure@Pass99"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  }
}
```

> Use the **new token** returned here for all subsequent admin requests.

---

### STEP 3 — Create a Class

```bash
curl -X POST http://localhost:5000/api/v1/admin/classes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "B.Tech Computer Science",
    "section": "A",
    "academicYear": "2024-2025",
    "description": "First year CSE batch",
    "subjects": ["Mathematics", "Physics", "Programming", "English"]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Class created successfully",
  "data": {
    "class": {
      "_id": "65b2c3d4e5f6a7b8c9d0e1f2",
      "name": "B.Tech Computer Science",
      "section": "A",
      "academicYear": "2024-2025",
      "students": [],
      "studentCount": 0,
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

> Save `_id` as `CLASS_ID` = `65b2c3d4e5f6a7b8c9d0e1f2`

---

### STEP 4 — Create a Teacher Account

```bash
curl -X POST http://localhost:5000/api/v1/admin/teachers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "Dr. Priya Sharma",
    "email": "priya.sharma@college.edu",
    "password": "Teacher@Temp123",
    "department": "Computer Science",
    "designation": "Associate Professor",
    "subjects": ["Data Structures", "Algorithms", "Programming"],
    "employeeId": "EMP001",
    "qualification": "Ph.D Computer Science",
    "phone": "+91-9876543210"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Teacher account created successfully",
  "data": {
    "user": {
      "_id": "65c3d4e5f6a7b8c9d0e1f2a3",
      "name": "Dr. Priya Sharma",
      "email": "priya.sharma@college.edu",
      "role": "teacher",
      "mustChangePassword": true
    },
    "teacher": {
      "_id": "65c3d4e5f6a7b8c9d0e1f2a4",
      "userId": "65c3d4e5f6a7b8c9d0e1f2a3",
      "department": "Computer Science",
      "subjects": ["Data Structures", "Algorithms", "Programming"],
      "employeeId": "EMP001"
    }
  }
}
```

> Save `teacher._id` as `TEACHER_ID` = `65c3d4e5f6a7b8c9d0e1f2a4`

---

### STEP 5 — Assign Teacher to Class

```bash
curl -X PATCH \
  http://localhost:5000/api/v1/admin/classes/CLASS_ID/assign-teacher \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "teacherId": "TEACHER_ID"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Class teacher assigned successfully",
  "data": {
    "class": {
      "_id": "65b2c3d4e5f6a7b8c9d0e1f2",
      "name": "B.Tech Computer Science",
      "classTeacher": {
        "_id": "65c3d4e5f6a7b8c9d0e1f2a4",
        "userId": {
          "name": "Dr. Priya Sharma",
          "email": "priya.sharma@college.edu"
        }
      }
    }
  }
}
```

---

### STEP 6 — Create Student Accounts

**Student 1:**
```bash
curl -X POST http://localhost:5000/api/v1/admin/students \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "Rahul Verma",
    "email": "rahul.verma@student.edu",
    "password": "Student@Temp123",
    "rollNumber": "CS001",
    "classId": "CLASS_ID",
    "section": "A",
    "admissionNumber": "ADM2024001",
    "phone": "+91-9123456780",
    "guardianName": "Suresh Verma",
    "guardianPhone": "+91-9123456789"
  }'
```

**Student 2:**
```bash
curl -X POST http://localhost:5000/api/v1/admin/students \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "Sneha Patel",
    "email": "sneha.patel@student.edu",
    "password": "Student@Temp123",
    "rollNumber": "CS002",
    "classId": "CLASS_ID",
    "section": "A",
    "admissionNumber": "ADM2024002"
  }'
```

**Response (Student 1):**
```json
{
  "success": true,
  "message": "Student account created successfully",
  "data": {
    "user": {
      "_id": "65d4e5f6a7b8c9d0e1f2a3b4",
      "name": "Rahul Verma",
      "email": "rahul.verma@student.edu",
      "role": "student",
      "mustChangePassword": true
    },
    "student": {
      "_id": "65d4e5f6a7b8c9d0e1f2a3b5",
      "rollNumber": "CS001",
      "classId": "65b2c3d4e5f6a7b8c9d0e1f2",
      "section": "A"
    }
  }
}
```

> Save `student._id` as `STUDENT1_ID` and `STUDENT2_ID`

---

### STEP 7 — Create Timetable Entry

```bash
curl -X POST http://localhost:5000/api/v1/admin/timetables \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "classId": "CLASS_ID",
    "teacherId": "TEACHER_ID",
    "subject": "Data Structures",
    "day": "Monday",
    "startTime": "09:00",
    "endTime": "10:00",
    "room": "Lab-101",
    "academicYear": "2024-2025"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Timetable entry created successfully",
  "data": {
    "entry": {
      "_id": "65e5f6a7b8c9d0e1f2a3b4c5",
      "classId": "65b2c3d4e5f6a7b8c9d0e1f2",
      "teacherId": "65c3d4e5f6a7b8c9d0e1f2a4",
      "subject": "Data Structures",
      "day": "Monday",
      "startTime": "09:00",
      "endTime": "10:00",
      "room": "Lab-101",
      "durationMinutes": 60
    }
  }
}
```

**Try creating a CONFLICTING slot (same teacher, same day, overlapping time):**
```bash
curl -X POST http://localhost:5000/api/v1/admin/timetables \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "classId": "CLASS_ID",
    "teacherId": "TEACHER_ID",
    "subject": "Algorithms",
    "day": "Monday",
    "startTime": "09:30",
    "endTime": "10:30"
  }'
```

**Conflict Response (409):**
```json
{
  "success": false,
  "status": "fail",
  "message": "Timetable conflict detected on Monday: [Data Structures 09:00–10:00 for this teacher]"
}
```

---

### STEP 8 — Teacher Login and First Operations

**Login as teacher:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "priya.sharma@college.edu",
    "password": "Teacher@Temp123"
  }'
```

**Teacher MUST change password (mustChangePassword: true):**
```bash
curl -X POST http://localhost:5000/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TEACHER_TOKEN" \
  -d '{
    "currentPassword": "Teacher@Temp123",
    "newPassword": "MyTeacher@Pass99",
    "confirmPassword": "MyTeacher@Pass99"
  }'
```

**Teacher views own timetable:**
```bash
curl http://localhost:5000/api/v1/teachers/my-timetable \
  -H "Authorization: Bearer TEACHER_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Timetable retrieved",
  "data": {
    "entries": [
      {
        "_id": "65e5f6a7b8c9d0e1f2a3b4c5",
        "subject": "Data Structures",
        "day": "Monday",
        "startTime": "09:00",
        "endTime": "10:00",
        "room": "Lab-101",
        "classId": {
          "name": "B.Tech Computer Science",
          "section": "A",
          "academicYear": "2024-2025"
        }
      }
    ]
  }
}
```

**Teacher views students in their class:**
```bash
curl http://localhost:5000/api/v1/teachers/class/CLASS_ID/students \
  -H "Authorization: Bearer TEACHER_TOKEN"
```

---

### STEP 9 — Student Login and First Operations

**Login as student:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rahul.verma@student.edu",
    "password": "Student@Temp123"
  }'
```

**Student changes password:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -d '{
    "currentPassword": "Student@Temp123",
    "newPassword": "RahulSecure@99",
    "confirmPassword": "RahulSecure@99"
  }'
```

**Student views own profile:**
```bash
curl http://localhost:5000/api/v1/students/me \
  -H "Authorization: Bearer STUDENT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved",
  "data": {
    "student": {
      "_id": "65d4e5f6a7b8c9d0e1f2a3b5",
      "rollNumber": "CS001",
      "section": "A",
      "userId": {
        "name": "Rahul Verma",
        "email": "rahul.verma@student.edu",
        "role": "student"
      },
      "classId": {
        "name": "B.Tech Computer Science",
        "section": "A",
        "academicYear": "2024-2025",
        "classTeacher": {
          "userId": {
            "name": "Dr. Priya Sharma"
          }
        }
      }
    }
  }
}
```

**Student views timetable:**
```bash
curl http://localhost:5000/api/v1/students/my-timetable \
  -H "Authorization: Bearer STUDENT_TOKEN"
```

**Student updates contact info:**
```bash
curl -X PUT http://localhost:5000/api/v1/students/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -d '{
    "phone": "+91-9999888877",
    "address": "123 Main Street, Delhi"
  }'
```

---

### STEP 10 — Admin Queries (Pagination + Filtering)

**List all teachers with pagination:**
```bash
curl "http://localhost:5000/api/v1/admin/teachers?page=1&limit=10&sortBy=name&order=asc" \
  -H "Authorization: Bearer TOKEN"
```

**Search teacher by name:**
```bash
curl "http://localhost:5000/api/v1/admin/teachers?search=priya" \
  -H "Authorization: Bearer TOKEN"
```

**List students in a specific class:**
```bash
curl "http://localhost:5000/api/v1/admin/students?classId=CLASS_ID&section=A&page=1&limit=20" \
  -H "Authorization: Bearer TOKEN"
```

**List classes for a specific academic year:**
```bash
curl "http://localhost:5000/api/v1/admin/classes?academicYear=2024-2025&isActive=true" \
  -H "Authorization: Bearer TOKEN"
```

**Response (paginated):**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### STEP 11 — Get Class Timetable (any authenticated user)

**Full week timetable for a class:**
```bash
curl "http://localhost:5000/api/v1/timetables/class/CLASS_ID" \
  -H "Authorization: Bearer TOKEN"
```

**Filter by specific day:**
```bash
curl "http://localhost:5000/api/v1/timetables/class/CLASS_ID?day=Monday" \
  -H "Authorization: Bearer TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Class timetable retrieved",
  "data": {
    "entries": [
      {
        "_id": "65e5f6a7b8c9d0e1f2a3b4c5",
        "subject": "Data Structures",
        "day": "Monday",
        "startTime": "09:00",
        "endTime": "10:00",
        "room": "Lab-101",
        "durationMinutes": 60,
        "teacherId": {
          "department": "Computer Science",
          "designation": "Associate Professor",
          "userId": {
            "name": "Dr. Priya Sharma",
            "email": "priya.sharma@college.edu"
          }
        }
      }
    ]
  }
}
```

---

## 🚨 Error Response Examples

### 400 — Validation Failed
```json
{
  "success": false,
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Valid email required", "value": "notanemail" },
    { "field": "password", "message": "Password must be at least 8 characters", "value": "" }
  ]
}
```

### 401 — Unauthorized
```json
{
  "success": false,
  "status": "fail",
  "message": "Authentication required – please log in."
}
```

### 403 — Forbidden (wrong role)
```json
{
  "success": false,
  "status": "fail",
  "message": "Your role (student) does not have access to this resource."
}
```

### 403 — Must change password
```json
{
  "success": false,
  "status": "fail",
  "message": "You must change your temporary password before proceeding. Use POST /api/v1/auth/change-password"
}
```

### 404 — Not Found
```json
{
  "success": false,
  "status": "fail",
  "message": "Student not found"
}
```

### 409 — Conflict
```json
{
  "success": false,
  "status": "fail",
  "message": "A user with this email already exists"
}
```

### 409 — Timetable Conflict
```json
{
  "success": false,
  "status": "fail",
  "message": "Timetable conflict detected on Monday: [Data Structures 09:00–10:00 for this teacher]"
}
```

---

## 🔐 Authentication Flow Summary

```
New User Created by Admin
         │
         ▼
   mustChangePassword = true
         │
         ▼
   User logs in → gets token
         │
         ▼
   ALL routes (except /auth/change-password)
   return 403 "must change password"
         │
         ▼
   POST /auth/change-password
         │
         ▼
   mustChangePassword = false
   New token issued
         │
         ▼
   Full access granted based on role
```

---

## 📊 Role Permission Matrix

| Action | admin | teacher | student |
|--------|-------|---------|---------|
| Create teacher/student/class | ✅ | ❌ | ❌ |
| Update/delete teacher/student | ✅ | ❌ | ❌ |
| Assign class/teacher | ✅ | ❌ | ❌ |
| Manage timetable | ✅ | ❌ | ❌ |
| View own profile | ✅ | ✅ | ✅ |
| Update own contact info | ✅ | ✅ | ✅ |
| View own timetable | ✅ | ✅ | ✅ |
| View assigned class students | ✅ | ✅ | ❌ |
| View own class info | ✅ | ❌ | ✅ |
