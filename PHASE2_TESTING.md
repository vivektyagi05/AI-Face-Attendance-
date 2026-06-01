# Phase 2 – AI Face Recognition Attendance
## Complete Testing Guide

---

## 🏗️ Updated Project Structure

```
smart-attendance/
├── docker-compose.yml                 ← One-command startup for all services
│
├── backend/                           ← Node.js + Express (Phase 1 + 2)
│   ├── Dockerfile
│   ├── server.js
│   ├── package.json
│   └── src/
│       ├── app.js                     ← ✅ Updated: attendance route added
│       ├── config/
│       ├── controllers/
│       │   ├── attendanceController.js  ← 🆕 Phase 2
│       │   └── ... (Phase 1 unchanged)
│       ├── middleware/
│       │   ├── faceUpload.js            ← 🆕 Phase 2 (multer for face images)
│       │   └── ... (Phase 1 unchanged)
│       ├── models/
│       │   ├── AttendanceSession.js     ← 🆕 Phase 2
│       │   └── ... (Phase 1 unchanged)
│       ├── routes/
│       │   ├── attendanceRoutes.js      ← 🆕 Phase 2
│       │   └── ... (Phase 1 unchanged)
│       └── services/
│           ├── aiService.js             ← 🆕 Phase 2 (HTTP client to Python)
│           ├── attendanceService.js     ← 🆕 Phase 2 (business logic)
│           └── ... (Phase 1 unchanged)
│
└── ai-service/                        ← Python Flask face recognition
    ├── Dockerfile
    ├── main.py                          ← Flask app factory
    ├── requirements.txt
    ├── .env.example
    ├── uploads/
    │   └── temp/                        ← Temp image storage (auto-cleaned)
    ├── logs/
    └── app/
        ├── __init__.py
        ├── routes/
        │   ├── __init__.py
        │   └── face_routes.py           ← POST /extract-embeddings, /recognize
        ├── services/
        │   ├── __init__.py
        │   └── face_service.py          ← Real dlib face recognition engine
        └── utils/
            ├── __init__.py
            └── image_utils.py           ← Preprocessing helpers
```

---

## 🚀 Setup: All Three Services

### Option A — Docker Compose (Recommended)

```bash
cd smart-attendance

# Create a .env file with secrets
cat > .env <<EOF
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
AI_SERVICE_API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ALLOWED_ORIGINS=http://localhost:3000
EOF

# Start everything
docker-compose up --build

# In another terminal, seed the admin
docker exec smart_attendance_backend node src/config/seed.js
```

### Option B — Manual (Development)

**Terminal 1 – MongoDB:**
```bash
mongod --dbpath ./data/db
```

**Terminal 2 – Python AI Service:**
```bash
cd ai-service

# First-time setup (needs cmake, build tools)
# macOS:  brew install cmake
# Ubuntu: sudo apt-get install cmake build-essential
# Windows: Install Visual Studio Build Tools

python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env: set AI_SERVICE_API_KEY

python main.py
# → http://localhost:8000
```

**Terminal 3 – Node.js Backend:**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env: set JWT_SECRET, AI_SERVICE_API_KEY (must match ai-service)
npm run dev
# → http://localhost:5000

# Seed admin
npm run seed
```

---

## ✅ Verification Checks

```bash
# 1. Backend health
curl http://localhost:5000/health
# → {"success":true,"status":"healthy",...}

# 2. AI service health
curl http://localhost:8000/health
# → {"status":"healthy","service":"face-recognition-ai",...}

# 3. AI service reachable from backend (as admin)
curl http://localhost:5000/api/v1/attendance/ai-health \
  -H "Authorization: Bearer ADMIN_TOKEN"
# → {"success":true,"message":"AI service is healthy",...}
```

---

## 📋 Complete API Flow

---

### STEP 1 — Login as Admin

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smartattendance.com","password":"Admin@123456"}'
```

Save the token → `ADMIN_TOKEN`

---

### STEP 2 — Create a Class (if not done in Phase 1)

```bash
curl -X POST http://localhost:5000/api/v1/admin/classes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "B.Tech CSE",
    "section": "A",
    "academicYear": "2024-2025"
  }'
```

Save `data.class._id` → `CLASS_ID`

---

### STEP 3 — Create a Student Account

```bash
curl -X POST http://localhost:5000/api/v1/admin/students \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Rahul Verma",
    "email": "rahul@student.edu",
    "password": "Student@Temp123",
    "rollNumber": "CS001",
    "classId": "CLASS_ID",
    "section": "A"
  }'
```

Save `data.student._id` → `STUDENT_ID`

---

### STEP 4 — Register Student Face (3–5 images required)

```bash
curl -X POST http://localhost:5000/api/v1/attendance/register-face/STUDENT_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "images=@/path/to/rahul_face1.jpg" \
  -F "images=@/path/to/rahul_face2.jpg" \
  -F "images=@/path/to/rahul_face3.jpg"
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Face registered successfully",
  "data": {
    "studentName": "Rahul Verma",
    "embeddingCount": 3
  }
}
```

**Failure — No face detected (422):**
```json
{
  "success": false,
  "message": "Only 1 usable face(s) extracted. Minimum 3 required.",
  "warnings": [
    "Image 2 (rahul_face2.jpg): no face detected",
    "Image 3 (rahul_face3.jpg): could not load or preprocess"
  ]
}
```

**Tips for good registration images:**
- Clear, well-lit frontal face
- No sunglasses, masks, or heavy shadows
- Different angles / expressions across the 3–5 images
- Minimum face size: ~150×150 pixels in the image

---

### STEP 5 — Create a Teacher + Login

```bash
# Admin creates teacher
curl -X POST http://localhost:5000/api/v1/admin/teachers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Dr. Priya Sharma",
    "email": "priya@college.edu",
    "password": "Teacher@Temp123",
    "department": "CSE"
  }'
```

```bash
# Teacher logs in
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"priya@college.edu","password":"Teacher@Temp123"}'

# Teacher must change password first
curl -X POST http://localhost:5000/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TEMP_TEACHER_TOKEN" \
  -d '{
    "currentPassword": "Teacher@Temp123",
    "newPassword": "MyTeacher@99",
    "confirmPassword": "MyTeacher@99"
  }'
```

Save new token → `TEACHER_TOKEN`

---

### STEP 6 — Take Attendance (classroom image upload)

This is the **core Phase 2 endpoint**. The teacher uploads a photo of the classroom.
The system detects all faces and marks matching students as present.

```bash
curl -X POST http://localhost:5000/api/v1/attendance/take \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -F "classroomImage=@/path/to/classroom_photo.jpg" \
  -F "classId=CLASS_ID" \
  -F "subject=Data Structures" \
  -F "date=2024-03-15" \
  -F "startTime=09:00" \
  -F "endTime=10:00" \
  -F "confidenceThreshold=0.55" \
  -F "academicYear=2024-2025"
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Attendance session created and processed",
  "data": {
    "session": {
      "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "classId": { "name": "B.Tech CSE", "section": "A" },
      "subject": "Data Structures",
      "date": "2024-03-15T00:00:00.000Z",
      "status": "completed",
      "totalStudents": 30,
      "presentCount": 24,
      "absentCount": 6,
      "recognizedCount": 24,
      "unknownFaces": 1,
      "attendancePercentage": 80,
      "aiProcessed": true,
      "aiProcessedAt": "2024-03-15T09:05:12.000Z",
      "records": [
        {
          "studentId": "...",
          "rollNumber": "CS001",
          "studentName": "Rahul Verma",
          "status": "present",
          "confidenceScore": 0.8734,
          "markedBy": "face_recognition",
          "faceLocation": [142, 398, 264, 276]
        },
        {
          "studentId": "...",
          "rollNumber": "CS002",
          "studentName": "Sneha Patel",
          "status": "absent",
          "confidenceScore": null,
          "markedBy": "default_absent"
        }
      ]
    }
  }
}
```

**Failure — No registered faces in class (400):**
```json
{
  "success": false,
  "message": "No students in this class have registered face data. Please register student faces before taking attendance."
}
```

**Failure — AI service down (503):**
```json
{
  "success": false,
  "message": "Face recognition service is currently unavailable"
}
```

---

### STEP 7 — Manual Override (correct AI mistake)

```bash
curl -X PATCH \
  http://localhost:5000/api/v1/attendance/sessions/SESSION_ID/override \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -d '{
    "studentId": "STUDENT_ID",
    "status": "present"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Attendance record updated",
  "data": {
    "session": { ... }
  }
}
```

---

### STEP 8 — View Attendance Reports

**Get a specific session:**
```bash
curl http://localhost:5000/api/v1/attendance/sessions/SESSION_ID \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

**List all sessions for a class:**
```bash
curl "http://localhost:5000/api/v1/attendance/sessions?classId=CLASS_ID&page=1&limit=10" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

**Filter by date range:**
```bash
curl "http://localhost:5000/api/v1/attendance/sessions?classId=CLASS_ID&startDate=2024-03-01&endDate=2024-03-31" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

**Student attendance report (as teacher or admin):**
```bash
curl "http://localhost:5000/api/v1/attendance/student/STUDENT_ID/report" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Student attendance report retrieved",
  "data": {
    "report": {
      "student": {
        "_id": "...",
        "name": "Rahul Verma",
        "rollNumber": "CS001",
        "class": { "name": "B.Tech CSE", "section": "A" }
      },
      "summary": {
        "totalSessions": 20,
        "presentSessions": 17,
        "absentSessions": 3,
        "attendancePercentage": 85
      },
      "records": [
        {
          "date": "2024-03-15T00:00:00.000Z",
          "subject": "Data Structures",
          "status": "present",
          "confidenceScore": 0.87,
          "markedBy": "face_recognition"
        },
        ...
      ]
    }
  }
}
```

**Student views their own report:**
```bash
curl "http://localhost:5000/api/v1/attendance/student/OWN_STUDENT_ID/report" \
  -H "Authorization: Bearer $STUDENT_TOKEN"
# Students can ONLY view their own report
```

**Class-level report (aggregate all students):**
```bash
curl "http://localhost:5000/api/v1/attendance/class/CLASS_ID/report?startDate=2024-03-01" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

**Response:**
```json
{
  "data": {
    "report": {
      "totalSessions": 10,
      "overallAverageAttendance": 78,
      "sessions": [ ... ],
      "studentSummaries": [
        {
          "studentName": "Rahul Verma",
          "rollNumber": "CS001",
          "presentCount": 9,
          "absentCount": 1,
          "percentage": 90
        },
        ...
      ]
    }
  }
}
```

---

## ⚙️ Confidence Threshold Tuning

| Threshold | Effect |
|-----------|--------|
| `0.40` | Very strict – low false-positives, may miss students |
| `0.50` | Strict – recommended for high-quality images |
| `0.55` | **Default – balanced accuracy** |
| `0.65` | Lenient – more matches, may include false-positives |
| `0.75` | Very lenient – not recommended for production |

> The `confidenceScore` in results is `1 - (distance / threshold)`.  
> A score of `0.87` means the face is 87% of the way from the threshold to a perfect match.

---

## 🧠 AI System Flow (Detailed)

```
Teacher uploads classroom_photo.jpg
              │
              ▼
    Node.js attendanceService
              │
              ├── 1. Validate class + students
              ├── 2. Load all faceEmbeddings from DB
              ├── 3. Create AttendanceSession (status: "processing")
              │
              ▼
    POST http://ai-service:8000/api/face/recognize
    Body: { classroom_image, student_embeddings[], threshold }
              │
              ▼
    Python face_service.recognize_faces_in_image()
              │
              ├── load_and_preprocess(image)
              │     • EXIF orientation fix
              │     • CLAHE for dark images
              │     • Downscale > 1920px
              │
              ├── face_recognition.face_locations()  ← dlib HOG detector
              │     Returns: [(top, right, bottom, left), ...]
              │
              ├── face_recognition.face_encodings()  ← dlib ResNet
              │     Returns: [[float*128], ...]
              │
              └── For each detected face:
                    Compare L2 distance to ALL stored embeddings
                    Best match < threshold → MATCH
                    Deduplicate: keep highest confidence per student
                    Unknown → increment unknownFaces counter
              │
              ▼
    JSON response: { matches[], unknownFaces, totalFaces, processingMs }
              │
              ▼
    Node.js: Apply matches → update session.records
              ├── Matched students   → status: "present"
              ├── Unmatched students → status: "absent"  (default)
              ├── session.status = "completed"
              └── Save to MongoDB
```

---

## ❗ Edge Cases Handled

| Scenario | Behaviour |
|----------|-----------|
| No face in classroom image | Session created; all students marked absent |
| Multiple faces detected | Each face matched independently |
| Same student in 2 spots | Highest-confidence match kept (deduplication) |
| Unknown person in image | Counted in `unknownFaces`, no false match |
| Low confidence match | Ignored (treated as absent) |
| AI service down | Session marked `failed`; clear error returned |
| Image too dark | CLAHE auto-enhancement applied |
| Large image (> 1920px) | Auto-downscaled before processing |
| Duplicate session same day | 409 Conflict with existing sessionId |
| Student with no face registered | Excluded from AI matching; still shown in records as absent |

---

## 🔐 Phase 2 API Permission Matrix

| Endpoint | admin | teacher | student |
|----------|-------|---------|---------|
| `POST /attendance/register-face/:id` | ✅ | ✅ | ❌ |
| `POST /attendance/take` | ✅ | ✅ | ❌ |
| `GET /attendance/sessions` | ✅ | ✅ (own only) | ❌ |
| `GET /attendance/sessions/:id` | ✅ | ✅ (own only) | ❌ |
| `PATCH /attendance/sessions/:id/override` | ✅ | ✅ | ❌ |
| `GET /attendance/student/:id/report` | ✅ | ✅ | ✅ (own only) |
| `GET /attendance/class/:id/report` | ✅ | ✅ | ❌ |
| `GET /attendance/ai-health` | ✅ | ❌ | ❌ |
