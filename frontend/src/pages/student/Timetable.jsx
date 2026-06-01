import React from 'react'
import { Calendar, Clock } from 'lucide-react'
import { studentApi } from '../../services/api'
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

export default function StudentTimetable() {
  const { data, loading } = useApi(() => studentApi.timetable(), [])
  const entries  = data?.entries ?? []
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  const byDay = DAYS.reduce((acc, d) => {
    acc[d] = entries
      .filter(e => e.day === d)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Today highlight */}
      <div className="card bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-5 h-5 text-white/80" />
          <div>
            <h2 className="font-bold text-lg">Today – {todayName}</h2>
            <p className="text-white/60 text-xs">
              {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="h-14 bg-white/10 rounded-xl animate-pulse" />)}
          </div>
        ) : byDay[todayName]?.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-white/70">🎉 No classes today – enjoy your day!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {byDay[todayName]?.map(e => (
              <div key={e._id} className="flex items-center gap-4 bg-white/10 rounded-xl px-4 py-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{e.subject}</p>
                  <p className="text-white/60 text-xs mt-0.5">
                    {e.startTime} – {e.endTime}
                    {e.teacherId?.userId?.name && ` · ${e.teacherId.userId.name}`}
                    {e.room && ` · 📍 ${e.room}`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-white/80 text-xs font-medium">{e.startTime}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {DAYS.map(day => (
          <div key={day} className="card p-0 overflow-hidden">
            <div className={`bg-gradient-to-r ${DAY_COLORS[day]} px-4 py-3 flex items-center justify-between`}>
              <h3 className="font-bold text-white text-sm">
                {day}
                {day === todayName && (
                  <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">Today</span>
                )}
              </h3>
              <span className="text-white/70 text-xs">
                {byDay[day].length} class{byDay[day].length !== 1 ? 'es' : ''}
              </span>
            </div>
            <div className="p-3 space-y-2 min-h-[80px]">
              {loading ? (
                <div className="h-14 bg-slate-100 rounded animate-pulse" />
              ) : byDay[day].length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Free day</p>
              ) : (
                byDay[day].map(e => (
                  <div key={e._id} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{e.subject}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {e.startTime} – {e.endTime}
                        </p>
                        {e.teacherId?.userId?.name && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            👤 {e.teacherId.userId.name}
                          </p>
                        )}
                      </div>
                      {e.room && (
                        <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg flex-shrink-0">
                          {e.room}
                        </span>
                      )}
                    </div>
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
