import React from 'react'
import { Calendar, Clock } from 'lucide-react'
import { teacherApi } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { DAYS } from '../../utils/helpers'

const DAY_COLORS = {
  Monday   : 'from-blue-500 to-blue-600',
  Tuesday  : 'from-purple-500 to-purple-600',
  Wednesday: 'from-emerald-500 to-emerald-600',
  Thursday : 'from-amber-500 to-amber-600',
  Friday   : 'from-rose-500 to-rose-600',
  Saturday : 'from-slate-400 to-slate-500',
}

export default function TeacherTimetable() {
  const { data, loading } = useApi(() => teacherApi.timetable(), [])
  const entries = data?.entries ?? []

  const byDay = DAYS.reduce((acc, d) => {
    acc[d] = entries.filter(e => e.day === d).sort((a,b) => a.startTime.localeCompare(b.startTime))
    return acc
  }, {})

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  return (
    <div className="space-y-6">
      {/* Today highlight */}
      <div className="card bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-5 h-5 text-white/80" />
          <h2 className="font-bold text-lg">Today – {todayName}</h2>
        </div>
        {loading ? (
          <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-14 bg-white/10 rounded-xl animate-pulse" />)}</div>
        ) : byDay[todayName]?.length === 0 ? (
          <p className="text-white/70 text-sm">No classes scheduled today</p>
        ) : (
          <div className="space-y-2">
            {byDay[todayName]?.map(e => (
              <div key={e._id} className="flex items-center gap-4 bg-white/10 rounded-xl px-4 py-3">
                <Clock className="w-4 h-4 text-white/70 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">{e.subject}</p>
                  <p className="text-white/70 text-xs">
                    {e.startTime}–{e.endTime} · {e.classId?.name} {e.classId?.section}
                    {e.room && ` · ${e.room}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full week grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {DAYS.map(day => (
          <div key={day} className="card p-0 overflow-hidden">
            <div className={`bg-gradient-to-r ${DAY_COLORS[day]} px-4 py-3 flex items-center justify-between`}>
              <h3 className="font-bold text-white text-sm">
                {day} {day === todayName && '(Today)'}
              </h3>
              <span className="text-white/70 text-xs">{byDay[day].length} class{byDay[day].length !== 1 ? 'es' : ''}</span>
            </div>
            <div className="p-3 space-y-2 min-h-[80px]">
              {loading ? (
                <div className="h-14 bg-slate-100 rounded animate-pulse" />
              ) : byDay[day].length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3">Free</p>
              ) : (
                byDay[day].map(e => (
                  <div key={e._id} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                    <p className="text-sm font-semibold text-slate-800">{e.subject}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {e.startTime}–{e.endTime}
                    </p>
                    {e.classId && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {e.classId.name} – {e.classId.section}
                      </p>
                    )}
                    {e.room && <p className="text-xs text-slate-400">📍 {e.room}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
