import React from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Users, ScanFace, ClipboardList, Clock } from 'lucide-react'
import StatCard from '../../components/common/StatCard'
import { teacherApi, attendanceApi } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { fmtDate, pctColor } from '../../utils/helpers'

export default function TeacherDashboard() {
  const { data: profile, loading: profileLoading } = useApi(() => teacherApi.profile(), [])
  const { data: classData, loading: classLoading }  = useApi(() => teacherApi.classes(), [])
  const { data: ttData,   loading: ttLoading }      = useApi(() => teacherApi.timetable(), [])
  const { data: sessions, loading: sessLoading }    = useApi(
    () => attendanceApi.sessions({ limit: 6, sortBy: 'date', order: 'desc' }),
    []
  )

  const classes  = classData?.classes ?? []
  const tt       = ttData?.entries    ?? []
  const sessArr  = sessions?.data     ?? []

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todayTT   = tt.filter(e => e.day === todayName)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users}       label="Assigned Classes"  value={classes.length} color="indigo" loading={classLoading} />
        <StatCard icon={Calendar}    label="Classes Today"     value={todayTT.length} color="green"  loading={ttLoading} />
        <StatCard icon={ClipboardList} label="Total Sessions"  value={sessArr.length} color="purple" loading={sessLoading} />
        <StatCard icon={ScanFace}    label="AI Sessions"
          value={sessArr.filter(s => s.aiProcessed).length} color="amber" loading={sessLoading} />
      </div>

      {/* Today's schedule */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800">
            Today's Schedule
            <span className="text-sm font-normal text-slate-400 ml-2">({todayName})</span>
          </h2>
          <Link to="/teacher/timetable" className="text-xs text-primary-600 font-semibold hover:underline">
            View full →
          </Link>
        </div>

        {ttLoading ? (
          <div className="space-y-2">
            {[1,2].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : todayTT.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No classes scheduled today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayTT.sort((a,b) => a.startTime.localeCompare(b.startTime)).map(entry => (
              <div key={entry._id} className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">{entry.subject}</p>
                  <p className="text-sm text-slate-500">
                    {entry.startTime} – {entry.endTime}
                    {entry.classId?.name && ` · ${entry.classId.name} ${entry.classId.section}`}
                    {entry.room && ` · ${entry.room}`}
                  </p>
                </div>
                <Link to="/teacher/attendance"
                  className="btn-primary text-xs py-2 px-3">
                  <ScanFace className="w-3.5 h-3.5" /> Take
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent sessions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800">Recent Sessions</h2>
          <Link to="/teacher/sessions" className="text-xs text-primary-600 font-semibold hover:underline">
            View all →
          </Link>
        </div>
        {sessLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />)}</div>
        ) : sessArr.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No sessions recorded yet</p>
        ) : (
          <div className="space-y-2">
            {sessArr.map(s => {
              const pct = s.totalStudents > 0 ? Math.round(s.presentCount / s.totalStudents * 100) : 0
              return (
                <div key={s._id} className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{s.subject}</p>
                    <p className="text-xs text-slate-400">
                      {s.classId?.name} · {fmtDate(s.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${pctColor(pct)}`}>{pct}%</p>
                    <p className="text-xs text-slate-400">{s.presentCount}/{s.totalStudents}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
