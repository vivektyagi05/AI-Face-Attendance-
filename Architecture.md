
🏗 SmartAttend System Architecture


┌─────────────────────────────────────┐
│            End Users                │
├─────────────────────────────────────┤
│  👨‍💼 Admin                          │
│  👨‍🏫 Teacher                        │
│  👨‍🎓 Student                        │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│         React Frontend (Vite)       │
├─────────────────────────────────────┤
│ Dashboard                           │
│ Teacher Management                  │
│ Student Management                  │
│ Class Management                    │
│ Timetable Management                │
│ Attendance Management               │
│ Authentication                      │
└─────────────────────────────────────┘
                 │
                 │ REST API
                 ▼
┌─────────────────────────────────────┐
│      Node.js + Express Backend      │
├─────────────────────────────────────┤
│ Authentication Service              │
│ User Management Service             │
│ Teacher Service                     │
│ Student Service                     │
│ Class Service                       │
│ Timetable Service                   │
│ Attendance Service                  │
│ Authorization Middleware            │
└─────────────────────────────────────┘
                 │
        ┌────────┴─────────┐
        │                  │
        ▼                  ▼

┌─────────────────┐   ┌───────────────────┐
│    MongoDB      │   │   AI Service      │
├─────────────────┤   ├───────────────────┤
│ Users           │   │ Face Detection    │
│ Teachers        │   │ Face Recognition  │
│ Students        │   │ Embeddings        │
│ Classes         │   │ Attendance AI     │
│ Timetables      │   └───────────────────┘
│ Attendance      │
└─────────────────┘


📊 High Level Workflow
Admin
 │
 ├── Create Teachers
 ├── Create Students
 ├── Create Classes
 ├── Assign Teacher
 ├── Enroll Students
 └── Create Timetable

Teacher
 │
 ├── Login
 ├── View Timetable
 ├── Take Attendance
 ├── View Students
 └── Attendance Reports

Student
 │
 ├── Login
 ├── View Profile
 ├── View Timetable
 ├── View Attendance
 └── Attendance Statistics

🤖 AI Attendance Flow
Teacher Uploads Classroom Image
               │
               ▼
       Attendance API
               │
               ▼
       AI Recognition Service
               │
      ┌────────┴─────────┐
      │                  │
      ▼                  ▼

 Face Matched      Face Not Matched
      │                  │
      ▼                  ▼

 Present           Absent

      │
      ▼

 Attendance Session Saved
      │
      ▼

 MongoDB Database

🐳 Deployment Architecture
                Docker Compose
                       │
 ┌─────────────────────┼─────────────────────┐
 │                     │                     │
 ▼                     ▼                     ▼

Frontend          Backend             AI Service
React/Vite       Node/Express         Python Flask

                      │
                      ▼

                   MongoDB

📈 Project Maturity
SmartAttend project progress

Estimated completion status of major modules.

Module	Progress
Authentication	100
Admin Panel	95
Teacher Module	75
Student Module	70
Timetable	90
Attendance AI	60