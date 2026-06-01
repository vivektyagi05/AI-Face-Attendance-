import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'

// ── Lazy pages ────────────────────────────────────────────────
const Login = lazy(() => import('./pages/Login'))

// Admin
const AdminLayout      = lazy(() => import('./components/common/AdminLayout'))
const AdminDashboard   = lazy(() => import('./pages/admin/Dashboard'))
const AdminTeachers    = lazy(() => import('./pages/admin/Teachers'))
const AdminStudents    = lazy(() => import('./pages/admin/Students'))
const AdminClasses     = lazy(() => import('./pages/admin/Classes'))
const AdminTimetable   = lazy(() => import('./pages/admin/Timetable'))

// Teacher
const TeacherLayout    = lazy(() => import('./components/common/TeacherLayout'))
const TeacherDashboard = lazy(() => import('./pages/teacher/Dashboard'))
const TeacherAttendance= lazy(() => import('./pages/teacher/TakeAttendance'))
const TeacherStudents  = lazy(() => import('./pages/teacher/Students'))
const TeacherTimetable = lazy(() => import('./pages/teacher/Timetable'))
const TeacherSessions  = lazy(() => import('./pages/teacher/Sessions'))

// Student
const StudentLayout    = lazy(() => import('./components/common/StudentLayout'))
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'))
const StudentAttendance= lazy(() => import('./pages/student/Attendance'))
const StudentTimetable = lazy(() => import('./pages/student/Timetable'))
const StudentProfile   = lazy(() => import('./pages/student/Profile'))

// Change password
const ChangePassword   = lazy(() => import('./pages/ChangePassword'))

const Spinner = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
  </div>
)

function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={`/${user.role}`} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/" element={<RoleRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={
              <ProtectedRoute><ChangePassword /></ProtectedRoute>
            } />

            {/* ── Admin ── */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="teachers"  element={<AdminTeachers />} />
              <Route path="students"  element={<AdminStudents />} />
              <Route path="classes"   element={<AdminClasses />} />
              <Route path="timetable" element={<AdminTimetable />} />
            </Route>

            {/* ── Teacher ── */}
            <Route path="/teacher" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherLayout />
              </ProtectedRoute>
            }>
              <Route index element={<TeacherDashboard />} />
              <Route path="attendance" element={<TeacherAttendance />} />
              <Route path="students"   element={<TeacherStudents />} />
              <Route path="timetable"  element={<TeacherTimetable />} />
              <Route path="sessions"   element={<TeacherSessions />} />
            </Route>

            {/* ── Student ── */}
            <Route path="/student" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentLayout />
              </ProtectedRoute>
            }>
              <Route index element={<StudentDashboard />} />
              <Route path="attendance" element={<StudentAttendance />} />
              <Route path="timetable"  element={<StudentTimetable />} />
              <Route path="profile"    element={<StudentProfile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: '12px', fontSize: '14px', fontWeight: '500' },
            success: { iconTheme: { primary: '#4f46e5', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  )
}
