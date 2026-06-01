# Phase 3 – Frontend + Full Integration + Docker
## Complete Setup & Testing Guide

---

## 📁 Final Project Structure

```
smart-attendance/
├── .env.example                   ← Root env template for Docker
├── docker-compose.yml             ← All 4 services wired together
│
├── frontend/                      ← React + Vite + TailwindCSS
│   ├── Dockerfile                 ← Multi-stage: build → nginx
│   ├── nginx.conf                 ← SPA routing + gzip + security headers
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                ← Router + lazy loading
│       ├── index.css              ← Tailwind + global utility classes
│       ├── context/
│       │   └── AuthContext.jsx    ← Global auth state + JWT storage
│       ├── hooks/
│       │   └── useApi.js          ← Generic data-fetching hook
│       ├── services/
│       │   └── api.js             ← Centralised Axios client + all API calls
│       ├── utils/
│       │   └── helpers.js         ← Date formatting, colour helpers
│       ├── routes/
│       │   └── ProtectedRoute.jsx ← Role-based route guard
│       ├── components/
│       │   └── common/
│       │       ├── AdminLayout.jsx
│       │       ├── TeacherLayout.jsx
│       │       ├── StudentLayout.jsx
│       │       ├── Sidebar.jsx
│       │       ├── Topbar.jsx
│       │       ├── StatCard.jsx
│       │       ├── Modal.jsx
│       │       ├── Table.jsx
│       │       ├── FormField.jsx
│       │       └── ConfirmDialog.jsx
│       └── pages/
│           ├── Login.jsx
│           ├── ChangePassword.jsx
│           ├── admin/
│           │   ├── Dashboard.jsx
│           │   ├── Teachers.jsx   ← Full CRUD
│           │   ├── Students.jsx   ← CRUD + face registration
│           │   ├── Classes.jsx    ← CRUD + assign teacher/students
│           │   └── Timetable.jsx  ← Weekly grid + conflict detection
│           ├── teacher/
│           │   ├── Dashboard.jsx  ← Today's schedule + recent sessions
│           │   ├── TakeAttendance.jsx ← 3-step AI attendance wizard
│           │   ├── Students.jsx   ← Per-class student list + reports
│           │   ├── Sessions.jsx   ← Session history + detail modal
│           │   └── Timetable.jsx  ← Weekly schedule view
│           └── student/
│               ├── Dashboard.jsx  ← Stats + attendance ring + today's classes
│               ├── Attendance.jsx ← History + monthly chart + filter
│               ├── Timetable.jsx  ← Daily + weekly view
│               └── Profile.jsx    ← Personal info + change password
│
├── backend/                       ← Node.js Express (Phase 1 + 2, unchanged)
│   ├── Dockerfile
│   └── src/ ...
│
└── ai-service/                    ← Python Flask (Phase 2, unchanged)
    ├── Dockerfile
    └── app/ ...
```

---

## 🚀 Quick Start (Docker – Recommended)

### Step 1 – Clone / enter project

```bash
cd smart-attendance
```

### Step 2 – Create environment file

```bash
cp .env.example .env
```

Edit `.env` and set strong secrets:

```env
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
AI_SERVICE_API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
VITE_API_URL=http://localhost:5000/api/v1
ALLOWED_ORIGINS=http://localhost:3000
```

### Step 3 – Build and start all services

```bash
docker-compose up --build
```

This starts (in dependency order):
1. **MongoDB** – waits until healthy
2. **AI Service** – waits until healthy (~30–40 s for dlib compile)
3. **Backend** – waits until MongoDB + AI are healthy
4. **Frontend** – waits until Backend is healthy

### Step 4 – Seed admin account

```bash
# In a new terminal (while docker-compose is running)
docker exec smart_backend node src/config/seed.js
```

Output:
```
✅  Admin account created
    Email   : admin@smartattendance.com
    Password: Admin@123456
```

### Step 5 – Open the app

| Service  | URL                       |
|----------|---------------------------|
| Frontend | http://localhost:3000     |
| Backend  | http://localhost:5000     |
| AI Svc   | http://localhost:8000     |

---

## 🖥️ Local Development (Without Docker)

### Terminal 1 – MongoDB

```bash
mongod --dbpath ./data/db
```

### Terminal 2 – AI Service

```bash
cd ai-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env     # set AI_SERVICE_API_KEY
python main.py
# → http://localhost:8000
```

### Terminal 3 – Backend

```bash
cd backend
npm install
cp .env.example .env     # set JWT_SECRET, AI_SERVICE_API_KEY
npm run seed             # create admin account
npm run dev
# → http://localhost:5000
```

### Terminal 4 – Frontend

```bash
cd frontend
npm install --legacy-peer-deps
cp .env.example .env     # VITE_API_URL=http://localhost:5000/api/v1
npm run dev
# → http://localhost:3000
```

---

## 🔄 Complete End-to-End Flow

### 1. Admin Flow

```
Login → admin@smartattendance.com / Admin@123456
         │
         ▼
    [Change password if prompted]
         │
         ├── Admin > Teachers → "Add Teacher"
         │     Name, Email, Temp Password, Department, Subjects
         │
         ├── Admin > Students → "Add Student"
         │     Name, Email, Temp Password, Roll Number, Select Class
         │
         ├── Admin > Students → 🔵 Face icon → "Register Face"
         │     Upload 3–5 clear face photos
         │
         ├── Admin > Classes → "Create Class"
         │     Name, Section, Academic Year
         │     → "Assign Teacher" (class teacher)
         │     → "Enroll Students"
         │
         └── Admin > Timetable → "Add Entry"
               Select Class, Teacher, Subject, Day, Time
```

### 2. Teacher Flow

```
Login → teacher@college.edu / [their password]
         │
         ▼
    [Change temp password on first login]
         │
         ├── Teacher Dashboard → see today's schedule
         │
         ├── Teacher > Take Attendance
         │     Step 1: Select class, subject, date
         │     Step 2: Upload classroom photo
         │     Step 3: AI results – present/absent per student
         │             Override any record manually
         │
         ├── Teacher > Students → click class tab → view list + reports
         │
         └── Teacher > Sessions → full history + session details
```

### 3. Student Flow

```
Login → student@edu.com / [their password]
         │
         ▼
    [Change temp password on first login]
         │
         ├── Student Dashboard
         │     Attendance % ring, today's classes, recent history
         │
         ├── Student > Attendance
         │     Monthly chart, filterable history (all/present/absent)
         │
         ├── Student > Timetable
         │     Today highlighted + full weekly grid
         │
         └── Student > Profile
               Personal info + change password
```

---

## 🎨 UI Features

| Feature | Implementation |
|---------|---------------|
| Responsive design | Tailwind CSS, works on mobile → desktop |
| Dark sidebar | Role-coloured gradient (blue=admin, indigo=teacher, green=student) |
| Lazy loading | All pages code-split via React.lazy() |
| Loading states | Skeleton loaders on tables, cards, charts |
| Toast notifications | react-hot-toast (success / error) |
| Role guards | ProtectedRoute – redirects on wrong role |
| Form validation | Client-side + server-error display |
| AI progress indicator | Animated progress bar during face processing |
| Attendance ring | SVG circle progress showing attendance % |
| Monthly bar chart | recharts BarChart for attendance trends |
| Drag-and-drop upload | react-dropzone for face registration |
| Confirm dialogs | Before any destructive action |
| Pagination | Backend-driven with page buttons |

---

## ⚠️ Troubleshooting

| Problem | Fix |
|---------|-----|
| Frontend shows blank | Check `VITE_API_URL` matches backend URL |
| AI service slow start | Normal – dlib loads on first request |
| "Must change password" loop | Complete password change via `/change-password` |
| Face registration fails | Ensure 3+ clear, well-lit frontal photos |
| CORS error in browser | Ensure `ALLOWED_ORIGINS` includes frontend URL |
| MongoDB connection refused | Confirm MongoDB is running and URI is correct |
| Docker build fails (dlib) | Increase Docker memory to 4 GB in Docker Desktop settings |
| `npm run build` fails | Run `npm install --legacy-peer-deps` first |

---

## 🔐 Security Notes

- JWT tokens expire in 7 days (configurable via `JWT_EXPIRES_IN`)
- New accounts have `mustChangePassword: true` → forced password change
- All file uploads validated by MIME type and size (max 10 MB)
- Rate limiting: 100 req/15 min globally, 20 req/15 min on auth
- MongoDB injection prevented by express-mongo-sanitize
- Students can only view their OWN attendance report
- Teachers can only manage sessions THEY created
- API key required for Node → Python communication

---

## 🌐 Environment Variables Summary

| Variable | Service | Description |
|----------|---------|-------------|
| `VITE_API_URL` | Frontend | Backend API base URL |
| `JWT_SECRET` | Backend | Token signing secret (min 32 chars) |
| `MONGODB_URI` | Backend | MongoDB connection string |
| `AI_SERVICE_URL` | Backend | Python AI service base URL |
| `AI_SERVICE_API_KEY` | Both | Shared auth key |
| `ALLOWED_ORIGINS` | Backend | CORS allowed origins |
| `FACE_DETECTION_MODEL` | AI | `hog` (CPU) or `cnn` (GPU) |
| `DEFAULT_THRESHOLD` | AI | Face match threshold (0.3–0.9) |
