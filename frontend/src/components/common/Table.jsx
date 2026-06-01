import React from 'react'

export function Table({ columns, rows, loading, emptyMsg = 'No data found' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-100">
            {columns.map(c => (
              <th key={c.key} className="table-th">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {loading
            ? Array(5).fill(0).map((_, i) => (
                <tr key={i}>
                  {columns.map(c => (
                    <td key={c.key} className="table-td">
                      <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.length === 0
              ? (
                <tr>
                  <td colSpan={columns.length} className="table-td text-center py-10 text-slate-400">
                    {emptyMsg}
                  </td>
                </tr>
              )
              : rows.map((row, i) => (
                  <tr key={row._id || i} className="hover:bg-slate-50 transition">
                    {columns.map(c => (
                      <td key={c.key} className="table-td">
                        {c.render ? c.render(row) : row[c.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))
          }
        </tbody>
      </table>
    </div>
  )
}

export function Pagination({ page, pages, total, limit, onPage }) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between px-1 mt-4">
      <p className="text-sm text-slate-500">
        Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total}
      </p>
      <div className="flex gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
        >
          Previous
        </button>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
          const p = page <= 3 ? i + 1 : page - 2 + i
          if (p > pages) return null
          return (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium ${
                p === page ? 'bg-primary-600 text-white' : 'border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          )
        })}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
