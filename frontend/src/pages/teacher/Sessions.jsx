import React, { useState, useCallback } from 'react'
import { ClipboardList, Eye, CheckCircle, XCircle, ScanFace, Filter } from 'lucide-react'
import { attendanceApi } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { Table, Pagination } from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import { fmtDate, pctColor } from '../../utils/helpers'

export default function TeacherSessions() {
  const [page,   setPage]   = useState(1)
  const [detail, setDetail] = useState(null)

  const fetchFn = useCallback(
    () => attendanceApi.sessions({ page, limit: 15, sortBy: 'date', order: 'desc' }),
    [page]
  )
  const { data, loading } = useApi(fetchFn, [page])

  const { data: sessionDetail, loading: detailLoading } = useApi(
    () => detail ? attendanceApi.session(detail._id) : Promise.resolve(null),
    [detail]
  )

  const sessions   = data?.data        ?? []
  const pagination = data?.pagination  ?? {}
  const fullSession = sessionDetail?.session ?? null

  const columns = [
    { key: 'class',   label: 'Class',   render: s => `${s.classId?.name || 'N/A'} – ${s.classId?.section || ''}` },
    { key: 'subject', label: 'Subject', render: s => s.subject || 'General' },
    { key: 'date',    label: 'Date',    render: s => fmtDate(s.date) },
    {
      key: 'result', label: 'Result',
      render: s => {
        const pct = s.totalStudents > 0 ? Math.round(s.presentCount / s.totalStudents * 100) : 0
        return (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> {s.presentCount}
            </div>
            <div className="flex items-center gap-1 text-red-400 text-xs font-medium">
              <XCircle className="w-3.5 h-3.5" /> {s.absentCount}
            </div>
            <span className={`font-bold text-sm ${pctColor(pct)}`}>{pct}%</span>
          </div>
        )
      },
    },
    {
      key: 'ai', label: 'AI',
      render: s => s.aiProcessed
        ? <span className="badge-green"><ScanFace className="w-3 h-3" /> Processed</span>
        : <span className="badge-amber">Manual</span>,
    },
    {
      key: 'status', label: 'Status',
      render: s => (
        <span className={`badge-${s.status === 'completed' ? 'green' : s.status === 'processing' ? 'amber' : 'red'}`}>
          {s.status}
        </span>
      ),
    },
    {
      key: 'actions', label: '',
      render: s => (
        <button onClick={() => setDetail(s)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600">
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="card p-0">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-purple-600" />
          <h2 className="text-base font-bold text-slate-800">Attendance Sessions</h2>
          <span className="ml-auto text-sm text-slate-400">{pagination.total ?? 0} total</span>
        </div>
        <div className="p-4">
          <Table columns={columns} rows={sessions} loading={loading} emptyMsg="No sessions recorded yet" />
          <Pagination {...pagination} onPage={setPage} />
        </div>
      </div>

      {/* Detail Modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Session Details" size="xl">
        {detailLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : fullSession ? (
          <div className="space-y-4">
            {/* Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Class',   value: `${fullSession.classId?.name} – ${fullSession.classId?.section}` },
                { label: 'Subject', value: fullSession.subject },
                { label: 'Date',    value: fmtDate(fullSession.date) },
                { label: 'Rate',    value: `${fullSession.totalStudents > 0 ? Math.round(fullSession.presentCount / fullSession.totalStudents * 100) : 0}%` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 font-medium">{label}</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {/* Records */}
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-100">
                    <th className="table-th">Student</th>
                    <th className="table-th">Roll No.</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Confidence</th>
                    <th className="table-th">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(fullSession.records || []).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="table-td">{r.userId?.name || r.studentName || '—'}</td>
                      <td className="table-td"><span className="badge-blue">{r.studentId?.rollNumber || r.rollNumber}</span></td>
                      <td className="table-td">
                        <span className={r.status === 'present' ? 'badge-green' : 'badge-red'}>{r.status}</span>
                      </td>
                      <td className="table-td">
                        {r.confidenceScore != null
                          ? `${Math.round(r.confidenceScore * 100)}%`
                          : '—'}
                      </td>
                      <td className="table-td text-xs text-slate-400">{r.markedBy?.replace('_', ' ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
