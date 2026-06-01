import React, { useState } from 'react'
import { Users, ChevronDown, Search, CheckCircle, XCircle } from 'lucide-react'
import { teacherApi, attendanceApi } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { Table } from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import { initialsAvatar, pctColor } from '../../utils/helpers'

export default function TeacherStudents() {
  const [selectedClass, setSelectedClass] = useState(null)
  const [search,        setSearch]        = useState('')
  const [reportStudent, setReportStudent] = useState(null)

  const { data: classData } = useApi(() => teacherApi.classes(), [])
  const classes = classData?.classes ?? []

  const { data: studentsData, loading } = useApi(
    () => selectedClass ? teacherApi.classStudents(selectedClass) : Promise.resolve({ data: { students: [] } }),
    [selectedClass]
  )
  const { data: reportData, loading: reportLoading } = useApi(
    () => reportStudent ? attendanceApi.studentReport(reportStudent._id || reportStudent.studentId?._id) : Promise.resolve(null),
    [reportStudent]
  )

  const students = studentsData?.students ?? []
  const filtered = students.filter(s => {
    if (!search) return true
    const name = s.userId?.name?.toLowerCase() || ''
    const roll = s.rollNumber?.toLowerCase() || ''
    return name.includes(search.toLowerCase()) || roll.includes(search.toLowerCase())
  })

  const columns = [
    {
      key: 'student', label: 'Student',
      render: s => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
            {initialsAvatar(s.userId?.name)}
          </div>
          <div>
            <p className="font-semibold text-slate-800">{s.userId?.name}</p>
            <p className="text-xs text-slate-400">{s.userId?.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'roll',    label: 'Roll No', render: s => <span className="badge-blue">{s.rollNumber}</span> },
    { key: 'section', label: 'Section', render: s => s.section || '—' },
    {
      key: 'face', label: 'Face',
      render: s => s.faceRegistered
        ? <span className="badge-green"><CheckCircle className="w-3 h-3" /> Yes</span>
        : <span className="badge-red"><XCircle className="w-3 h-3" /> No</span>,
    },
    {
      key: 'attendance', label: 'Attendance %',
      render: s => {
        const pct = s.attendanceSummary?.percentage ?? 0
        return <span className={`font-bold ${pctColor(pct)}`}>{pct}%</span>
      },
    },
    {
      key: 'actions', label: '',
      render: s => (
        <button onClick={() => setReportStudent(s)}
          className="text-xs text-primary-600 font-semibold hover:underline">
          View Report
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Class selector */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {classes.map(c => (
            <button key={c._id}
              onClick={() => setSelectedClass(c._id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
                selectedClass === c._id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-primary-300'
              }`}>
              {c.name} – {c.section}
            </button>
          ))}
          {classes.length === 0 && (
            <p className="text-sm text-slate-400 py-2">No assigned classes</p>
          )}
        </div>
        {selectedClass && (
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…" className="input pl-9 w-48" />
          </div>
        )}
      </div>

      {selectedClass ? (
        <div className="card p-0">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-800">Student List</h2>
            <span className="ml-auto text-sm text-slate-400">{filtered.length} students</span>
          </div>
          <div className="p-4">
            <Table columns={columns} rows={filtered} loading={loading} emptyMsg="No students in this class" />
          </div>
        </div>
      ) : (
        <div className="card text-center py-16">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Select a class to view students</p>
        </div>
      )}

      {/* Report Modal */}
      <Modal open={!!reportStudent} onClose={() => setReportStudent(null)}
        title={`Attendance Report – ${reportStudent?.userId?.name}`} size="lg">
        {reportLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reportData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total',   val: reportData.summary?.totalSessions   },
                { label: 'Present', val: reportData.summary?.presentSessions },
                { label: 'Absent',  val: reportData.summary?.absentSessions  },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800">{s.val ?? 0}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600">Overall:</span>
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${
                  (reportData.summary?.attendancePercentage ?? 0) >= 75 ? 'bg-emerald-500' :
                  (reportData.summary?.attendancePercentage ?? 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'
                }`} style={{ width: `${reportData.summary?.attendancePercentage ?? 0}%` }} />
              </div>
              <span className={`font-bold text-sm ${pctColor(reportData.summary?.attendancePercentage ?? 0)}`}>
                {reportData.summary?.attendancePercentage ?? 0}%
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {(reportData.records || []).map((r, i) => (
                <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl ${
                  r.status === 'present' ? 'bg-emerald-50' : 'bg-slate-50'
                }`}>
                  {r.status === 'present'
                    ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    : <XCircle     className="w-4 h-4 text-slate-400    flex-shrink-0" />}
                  <span className="text-sm text-slate-700 flex-1">{r.subject}</span>
                  <span className="text-xs text-slate-400">
                    {r.date ? new Date(r.date).toLocaleDateString() : ''}
                  </span>
                  <span className={r.status === 'present' ? 'badge-green' : 'badge-red'}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : <p className="text-sm text-slate-400 text-center py-8">No attendance data found</p>}
      </Modal>
    </div>
  )
}
