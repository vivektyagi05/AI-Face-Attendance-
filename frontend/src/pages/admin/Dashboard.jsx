import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, GraduationCap, BookOpen, BarChart2, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react'
import StatCard from '../../components/common/StatCard'
import { teachersApi, studentsApi, classesApi, attendanceApi } from '../../services/api'
import { fmtDate, pctColor } from '../../utils/helpers'

export default function AdminDashboard() {
  const [stats,    setStats]    = useState({})
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      teachersApi.list({ limit: 1 }),
      studentsApi.list({ limit: 1 }),
      classesApi.list({ limit: 1 }),
      attendanceApi.sessions({ limit: 8, sortBy: 'date', order: 'desc' }),
    ]).then(([t, s, c, a]) => {
      setStats({
        teachers : t.data.pagination?.total ?? 0,
        students : s.data.pagination?.total ?? 0,
        classes  : c.data.pagination?.total ?? 0,
      })
     setSessions(a.data.sessions ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users}          label="Total Teachers"  value={stats.teachers} color="indigo" loading={loading} />
        <StatCard icon={GraduationCap}  label="Total Students"  value={stats.students} color="green"  loading={loading} />
        <StatCard icon={BookOpen}       label="Active Classes"  value={stats.classes}  color="purple" loading={loading} />
        <StatCard icon={BarChart2}      label="Sessions Today"  value={sessions.filter(s => fmtDate(s.date) === fmtDate(new Date())).length} color="amber" loading={loading} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { to: '/admin/teachers',  label: 'Add Teacher',  icon: Users,         color: 'bg-indigo-600' },
          { to: '/admin/students',  label: 'Add Student',  icon: GraduationCap, color: 'bg-emerald-600' },
          { to: '/admin/classes',   label: 'New Class',    icon: BookOpen,      color: 'bg-purple-600' },
          { to: '/admin/timetable', label: 'Add Schedule', icon: Clock,         color: 'bg-amber-600' },
        ].map(({ to, label, icon: Icon, color }) => (
          <Link key={to} to={to}
            className="card flex items-center gap-3 hover:shadow-card-md transition-shadow group p-4">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700">{label}</span>
          </Link>
        ))}
      </div>

      {/* Recent Sessions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800">Recent Attendance Sessions</h2>
          <TrendingUp className="w-5 h-5 text-slate-400" />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No attendance sessions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="table-th">Class</th>
                  <th className="table-th">Subject</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">Present</th>
                  <th className="table-th">Absent</th>
                  <th className="table-th">Rate</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sessions.map(s => {
                  const pct = s.totalStudents > 0 ? Math.round(s.presentCount / s.totalStudents * 100) : 0
                  return (
                    <tr key={s._id} className="hover:bg-slate-50">
                      <td className="table-td font-medium">
                        {s.classId?.name} – {s.classId?.section}
                      </td>
                      <td className="table-td">{s.subject}</td>
                      <td className="table-td">{fmtDate(s.date)}</td>
                      <td className="table-td">
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle className="w-3.5 h-3.5" /> {s.presentCount}
                        </span>
                      </td>
                      <td className="table-td">
                        <span className="flex items-center gap-1 text-red-500">
                          <XCircle className="w-3.5 h-3.5" /> {s.absentCount}
                        </span>
                      </td>
                      <td className="table-td">
                        <span className={`font-bold ${pctColor(pct)}`}>{pct}%</span>
                      </td>
                      <td className="table-td">
                        <span className={`badge-${s.status === 'completed' ? 'green' : s.status === 'processing' ? 'amber' : 'red'}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
