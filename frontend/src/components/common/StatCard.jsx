import React from 'react'

export default function StatCard({ icon: Icon, label, value, sub, color = 'blue', loading }) {
  const colorMap = {
    blue  : 'bg-blue-50 text-blue-600',
    green : 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber : 'bg-amber-50 text-amber-600',
    red   : 'bg-red-50 text-red-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  }

  return (
    <div className="card flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        {loading
          ? <div className="h-8 w-20 bg-slate-200 rounded animate-pulse mt-1" />
          : <p className="text-2xl font-bold text-slate-800 mt-0.5">{value ?? '—'}</p>
        }
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
