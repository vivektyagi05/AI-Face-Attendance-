import React from 'react'
import { Link } from 'react-router-dom'
import { BarChart2, Calendar, BookOpen, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react'
import StatCard from '../../components/common/StatCard'
import { studentApi, attendanceApi } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { fmtDate, pctColor, pctBg } from '../../utils/helpers'

export default function StudentDashboard() {
  const { user } = useAuth()

  const { data: profile, loading: profileLoading } = useApi(() => studentApi.profile(), [])
  const { data: ttData,  loading: ttLoading }       = useApi(() => studentApi.timetable(), [])

  const student  = profile?.student
  const tt       = ttData?.entries ?? []
  const today    = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todayTT  = tt.filter(e => e.day === today)

  // Fetch attendance report only when we have a student ID
  const studentId = student?._id
  const { data: reportData, loading: reportLoading } = useApi(
    () => studentId ? attendanceApi.studentReport(studentId) : Promise.resolve(null),
    [studentId]
  )

  const summary = reportData?.summary ?? {}
  const recentRecords = (reportData?.records ?? []).slice(0, 6)
  const pct = summary.attendancePercentage ?? 0

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm">Welcome back,</p>
            <h2 className="text-2xl font-extrabold mt-0.5">{user?.name?.split(' ')[0] ?? 'Student'} 👋</h2>
            {student && (
              <p className="text-white/70 text-sm mt-1">
                {student.classId?.name} · Section {student.section} · Roll {student.rollNumber}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs">Today</p>
            <p className="text-white font-bold">{new Date().toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={BarChart2}    label="Attendance Rate"  value={reportLoading ? null : `${pct}%`}                    color={pct >= 75 ? 'green' : pct >= 50 ? 'amber' : 'red'} loading={reportLoading} />
        <StatCard icon={CheckCircle}  label="Classes Attended" value={reportLoading ? null : summary.presentSessions ?? 0} color="green"  loading={reportLoading} />
        <StatCard icon={XCircle}      label="Classes Missed"   value={reportLoading ? null : summary.absentSessions  ?? 0} color="red"    loading={reportLoading} />
        <StatCard icon={Calendar}     label="Classes Today"    value={ttLoading ? null : todayTT.length}                   color="indigo" loading={ttLoading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Attendance summary */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800">Attendance Overview</h2>
            <Link to="/student/attendance" className="text-xs text-primary-600 font-semibold hover:underline">
              View details →
            </Link>
          </div>

          {reportLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />)}</div>
          ) : (
            <div className="space-y-4">
              {/* Progress ring */}
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24 flex-shrink-0">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                    <circle cx="50" cy="50" r="40" fill="none"
                      stroke={pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="10"
                      strokeDasharray={`${pct * 2.513} 251.3`}
                      strokeLinecap="round"
                      className="transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-lg font-extrabold ${pctColor(pct)}`}>{pct}%</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {[
                    { label: 'Total Sessions',   val: summary.totalSessions   ?? 0, color: 'text-slate-800' },
                    { label: 'Present',          val: summary.presentSessions ?? 0, color: 'text-emerald-600' },
                    { label: 'Absent',           val: summary.absentSessions  ?? 0, color: 'text-red-500'    },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-sm text-slate-500">{label}</span>
                      <span className={`text-sm font-bold ${color}`}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {pct < 75 && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-xs text-red-700 font-semibold">
                    ⚠️ Your attendance is below 75%. You need {Math.ceil(((75 * (summary.totalSessions ?? 0) / 100) - (summary.presentSessions ?? 0)) / 0.25)} more sessions to reach 75%.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Today's classes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800">Today's Classes</h2>
            <Link to="/student/timetable" className="text-xs text-primary-600 font-semibold hover:underline">
              Full schedule →
            </Link>
          </div>
          {ttLoading ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-14 bg-slate-100 rounded animate-pulse" />)}</div>
          ) : todayTT.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No classes today!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTT.sort((a,b) => a.startTime.localeCompare(b.startTime)).map(e => (
                <div key={e._id} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{e.subject}</p>
                    <p className="text-xs text-slate-500">
                      {e.startTime}–{e.endTime}
                      {e.teacherId?.userId?.name && ` · ${e.teacherId.userId.name}`}
                      {e.room && ` · ${e.room}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent attendance */}
      {recentRecords.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800">Recent Attendance</h2>
            <Link to="/student/attendance" className="text-xs text-primary-600 font-semibold hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {recentRecords.map((r, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${r.status === 'present' ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                {r.status === 'present'
                  ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : <XCircle     className="w-4 h-4 text-slate-400    flex-shrink-0" />}
                <span className="text-sm font-medium text-slate-700 flex-1">{r.subject}</span>
                <span className="text-xs text-slate-400">{fmtDate(r.date)}</span>
                <span className={r.status === 'present' ? 'badge-green' : 'badge-red'}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
