# Smart Attendance & Academic Management Platform
## Phase 1 – Setup & Run Guide

---

## 📋 Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 | https://nodejs.org |
| npm | ≥ 10 | bundled with Node |
| MongoDB | ≥ 7 | https://www.mongodb.com/try/download/community |
| Git | any | https://git-scm.com |

---

## 🚀 Step-by-Step Setup

### Step 1 – Install dependencies

```bash
cd smart-attendance-backend
npm install
```

### Step 2 – Configure environment

```bash
cp .env.example .env
```

Open `.env` and update:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/smart_attendance
JWT_SECRET=replace_this_with_a_long_random_string_min_32_chars
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=internal_ai_key_change_in_production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
```

> ⚠️ **Critical:** Set a strong random `JWT_SECRET`. You can generate one with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### Step 3 – Start MongoDB

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Ubuntu / Debian
sudo systemctl start mongod

# Windows
net start MongoDB

# Verify
mongosh --eval "db.adminCommand('ping')"
```

### Step 4 – Seed the admin account

```bash
npm run seed
```

Output:
```
✅  Admin account created
    Email   : admin@smartattendance.com
    Password: Admin@123456
    ⚠️  Change this password immediately after first login!
```

### Step 5 – Start the server

```bash
# Development (auto-restart on file change)
npm run dev

# Production
npm start
```

Expected output:
```
2024-01-15 10:00:00 [INFO   ]: ✅  MongoDB connected → localhost/smart_attendance
2024-01-15 10:00:00 [INFO   ]: 🚀  Server running on http://localhost:5000  [development]
```

### Step 6 – Verify it's running

```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "service": "smart-attendance-backend",
  "version": "1.0.0"
}
```

---

## 📁 Final Folder Structure

```
smart-attendance-backend/
├── server.js                          ← Entry point
├── package.json
├── .env                               ← Your config (never commit this)
├── .env.example                       ← Template
├── logs/                              ← Auto-created on first run
│   ├── combined.log
│   ├── error.log
│   └── exceptions.log
├── uploads/                           ← Auto-created on first run
│   ├── faces/
│   └── captures/
└── src/
    ├── app.js                         ← Express app factory
    ├── config/
    │   ├── database.js                ← MongoDB connection
    │   └── seed.js                    ← Admin seeder
    ├── controllers/
    │   ├── authController.js
    │   ├── adminController.js
    │   ├── teacherController.js
    │   ├── studentController.js
    │   ├── classController.js
    │   └── timetableController.js
    ├── middleware/
    │   ├── auth.js                    ← JWT + RBAC
    │   ├── errorHandler.js            ← Global 404 + error handler
    │   ├── upload.js                  ← Multer file uploads
    │   └── validate.js                ← express-validator bridge
    ├── models/
    │   ├── User.js
    │   ├── Teacher.js
    │   ├── Student.js
    │   ├── Class.js
    │   └── Timetable.js
    ├── routes/
    │   ├── authRoutes.js
    │   ├── adminRoutes.js
    │   ├── teacherRoutes.js
    │   ├── studentRoutes.js
    │   ├── classRoutes.js
    │   └── timetableRoutes.js
    ├── services/
    │   ├── authService.js
    │   ├── userService.js             ← Teacher + Student CRUD
    │   ├── classService.js
    │   └── timetableService.js
    └── utils/
        ├── ApiError.js                ← Custom error class
        ├── ApiResponse.js             ← Standardised JSON helpers
        ├── logger.js                  ← Winston logger
        ├── pagination.js              ← Reusable query builder
        └── validators.js              ← All express-validator chains
```

---

## 🔑 API Base URL

```
http://localhost:5000/api/v1
```

---

## 🌐 All Routes Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | ❌ | Login with email + password |
| POST | `/auth/change-password` | ✅ | Change password |
| GET | `/auth/me` | ✅ | Get current user profile |

### Admin – Teachers
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/admin/teachers` | Admin | Create teacher |
| GET | `/admin/teachers` | Admin | List teachers (paginated) |
| GET | `/admin/teachers/:id` | Admin | Get teacher |
| PUT | `/admin/teachers/:id` | Admin | Update teacher |
| DELETE | `/admin/teachers/:id` | Admin | Deactivate teacher |

### Admin – Students
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/admin/students` | Admin | Create student |
| GET | `/admin/students` | Admin | List students (paginated) |
| GET | `/admin/students/:id` | Admin | Get student |
| PUT | `/admin/students/:id` | Admin | Update student |
| DELETE | `/admin/students/:id` | Admin | Deactivate student |

### Admin – Classes
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/admin/classes` | Admin | Create class |
| GET | `/admin/classes` | Admin | List classes |
| GET | `/admin/classes/:id` | Admin | Get class with students |
| PUT | `/admin/classes/:id` | Admin | Update class |
| DELETE | `/admin/classes/:id` | Admin | Deactivate class |
| PATCH | `/admin/classes/:id/assign-teacher` | Admin | Assign class teacher |
| PATCH | `/admin/classes/:id/assign-students` | Admin | Enroll students |
| DELETE | `/admin/classes/:id/students/:studentId` | Admin | Remove student |

### Admin – Timetable
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/admin/timetables` | Admin | Create timetable entry |
| GET | `/admin/timetables` | Admin | List entries |
| GET | `/admin/timetables/:id` | Admin | Get entry |
| PUT | `/admin/timetables/:id` | Admin | Update entry |
| DELETE | `/admin/timetables/:id` | Admin | Deactivate entry |

### Teacher
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/teachers/me` | Teacher | Own profile |
| PUT | `/teachers/me` | Teacher | Update own profile |
| GET | `/teachers/my-timetable` | Teacher | Own schedule |
| GET | `/teachers/my-classes` | Teacher | Assigned classes |
| GET | `/teachers/class/:classId/students` | Teacher | Students in a class |

### Student
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/students/me` | Student | Own profile |
| PUT | `/students/me` | Student | Update contact info |
| GET | `/students/my-timetable` | Student | Class timetable |
| GET | `/students/my-class` | Student | Class info + teacher |

### Shared
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/classes/:id` | Any | Class details |
| GET | `/classes/:id/timetable` | Any | Class timetable |
| GET | `/timetables/class/:classId` | Any | Timetable by class |
| GET | `/timetables/teacher/:teacherId` | Any | Timetable by teacher |
| GET | `/timetables/:id` | Any | Single timetable entry |
