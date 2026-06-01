import axios from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Attach JWT ────────────────────────────────────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Global error handler ──────────────────────────────────────
api.interceptors.response.use(
  res => res,
  err => {
    const status  = err.response?.status
    const message = err.response?.data?.message || 'Something went wrong'

    if (status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
      return Promise.reject(err)
    }

    if (status !== 409 && status !== 422) {
      // 409/422 handled at call-site
      toast.error(message)
    }

    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  login         : data => api.post('/auth/login', data),
  changePassword: data => api.post('/auth/change-password', data),
  getMe         : ()   => api.get('/auth/me'),
}

// ── Admin – Teachers ──────────────────────────────────────────
export const teachersApi = {
  list  : params => api.get('/admin/teachers', { params }),
  get   : id     => api.get(`/admin/teachers/${id}`),
  create: data   => api.post('/admin/teachers', data),
  update: (id,d) => api.put(`/admin/teachers/${id}`, d),
  remove: id     => api.delete(`/admin/teachers/${id}`),
}

// ── Admin – Students ──────────────────────────────────────────
export const studentsApi = {
  list  : params => api.get('/admin/students', { params }),
  get   : id     => api.get(`/admin/students/${id}`),
  create: data   => api.post('/admin/students', data),
  update: (id,d) => api.put(`/admin/students/${id}`, d),
  remove: id     => api.delete(`/admin/students/${id}`),
}

// ── Admin – Classes ───────────────────────────────────────────
export const classesApi = {
  list           : params => api.get('/admin/classes', { params }),
  get            : id     => api.get(`/admin/classes/${id}`),
  create         : data   => api.post('/admin/classes', data),
  update         : (id,d) => api.put(`/admin/classes/${id}`, d),
  remove         : id     => api.delete(`/admin/classes/${id}`),
  assignTeacher  : (id,d) => api.patch(`/admin/classes/${id}/assign-teacher`, d),
  assignStudents : (id,d) => api.patch(`/admin/classes/${id}/assign-students`, d),
}

// ── Admin – Timetable ─────────────────────────────────────────
export const timetableApi = {
  list  : params => api.get('/admin/timetables', { params }),
  get   : id     => api.get(`/admin/timetables/${id}`),
  create: data   => api.post('/admin/timetables', data),
  update: (id,d) => api.put(`/admin/timetables/${id}`, d),
  remove: id     => api.delete(`/admin/timetables/${id}`),
  byClass  : (classId, day) => api.get(`/timetables/class/${classId}`, { params: { day } }),
  byTeacher: (teacherId, day) => api.get(`/timetables/teacher/${teacherId}`, { params: { day } }),
}

// ── Attendance ────────────────────────────────────────────────
export const attendanceApi = {
  registerFace: (studentId, formData) =>
    api.post(`/attendance/register-face/${studentId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }),

  take: formData =>
    api.post('/attendance/take', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }),

  sessions      : params       => api.get('/attendance/sessions', { params }),
  session       : id           => api.get(`/attendance/sessions/${id}`),
  override      : (id, data)   => api.patch(`/attendance/sessions/${id}/override`, data),
  studentReport : (id, params) => api.get(`/attendance/student/${id}/report`, { params }),
  classReport   : (id, params) => api.get(`/attendance/class/${id}/report`, { params }),
  aiHealth      : ()           => api.get('/attendance/ai-health'),
}

// ── Teacher self-service ──────────────────────────────────────
export const teacherApi = {
  profile    : ()    => api.get('/teachers/me'),
  timetable  : (day) => api.get('/teachers/my-timetable', { params: { day } }),
  classes    : ()    => api.get('/teachers/my-classes'),
  classStudents: id  => api.get(`/teachers/class/${id}/students`),
}

// ── Student self-service ──────────────────────────────────────
export const studentApi = {
  profile   : ()    => api.get('/students/me'),
  timetable : (day) => api.get('/students/my-timetable', { params: { day } }),
  myClass   : ()    => api.get('/students/my-class'),
}

export default api
