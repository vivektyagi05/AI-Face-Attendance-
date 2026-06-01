import React, { useState } from 'react'
import { BarChart2, CheckCircle, XCircle, Calendar } from 'lucide-react'
import { attendanceApi, studentApi } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { fmtDate, pctColor, pctBg } from '../../utils/helpers'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function StudentAttendance() {
  const [filter, setFilter] = useState('all') // all | present | absent

  const { data: profile } = useApi(() => studentApi.profile(), [])
  const studentId = profile?.student?._id

  const { data: reportData, loading } = useApi(
    () => studentId ? attendanceApi.studentReport(studentId) : Promise.resolve(null),
    [studentId]
  )

  const summary = reportData?.summary ?? {}
  const records = reportData?.records ?? []
  const pct     = summary.attendancePercentage ?? 0

  const filtered = filter === 'all'
    ? records
    : records.filter(r => r.status === filter)

  // Build monthly chart data
  const monthlyMap = {}
  records.forEach(r => {
    const key = r.date ? new Date(r.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : 'N/A'
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, present: 0, absent: 0 }
    if (r.status === 'present') monthlyMap[key].present++
    else                        monthlyMap[key].absent++
  })
  const chartData = Object.values(monthlyMap).slice(-6)

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`card text-center p-6 border-2 ${pct >= 75 ? 'border-emerald-200 bg-emerald-50' : pct >= 50 ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'}`}>
          <p className={`text-5xl font-extrabold ${pctColor(pct)}`}>{pct}%</p>
          <p className="text-sm font-semibold text-slate-600 mt-2">Overall Attendance</p>
          <p className="text-xs text-slate-400 mt-1">{summary.totalSessions ?? 0} total sessions</p>
        </div>
        <div className="card text-center p-6 border-2 border-emerald-100">
          <p className="text-5xl font-extrabold text-emerald-600">{summary.presentSessions ?? 0}</p>
          <p className="text-sm font-semibold text-slate-600 mt-2">Present</p>
          <p className="text-xs text-slate-400 mt-1">Classes attended</p>
        </div>
        <div className="card text-center p-6 border-2 border-red-100">
          <p className="text-5xl font-extrabold text-red-500">{summary.absentSessions ?? 0}</p>
          <p className="text-sm font-semibold text-slate-600 mt-2">Absent</p>
          <p className="text-xs text-slate-400 mt-1">Classes missed</p>
        </div>
      </div>

      {/* Monthly chart */}
      {chartData.length > 0 && (
        <div className="card">
          <h2 className="text-base font-bold text-slate-800 mb-4">Monthly Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barGap={4} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Bar dataKey="present" name="Present" fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="absent"  name="Absent"  fill="#fca5a5" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Records table */}
      <div className="card p-0">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-800">Attendance History</h2>
          </div>
          <div className="ml-auto flex gap-2">
            {['all','present','absent'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  filter === f
                    ? f === 'present' ? 'bg-emerald-600 text-white'
                    : f === 'absent'  ? 'bg-red-500 text-white'
                    :                   'bg-primary-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                {f === 'all' ? `All (${records.length})` : f === 'present' ? `Present (${summary.presentSessions ?? 0})` : `Absent (${summary.absentSessions ?? 0})`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <BarChart2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400">No records found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((r, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  r.status === 'present' ? 'bg-emerald-100' : 'bg-red-100'
                }`}>
                  {r.status === 'present'
                    ? <CheckCircle className="w-4 h-4 text-emerald-600" />
                    : <XCircle     className="w-4 h-4 text-red-400"     />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{r.subject || 'General'}</p>
                  <p className="text-xs text-slate-400">
                    {r.class?.name && `${r.class.name} · `}{fmtDate(r.date)}
                    {r.markedBy === 'face_recognition' && r.confidenceScore != null && ` · ${Math.round(r.confidenceScore * 100)}% match`}
                  </p>
                </div>
                <span className={r.status === 'present' ? 'badge-green' : 'badge-red'}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
