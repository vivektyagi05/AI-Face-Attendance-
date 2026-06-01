import React, { useState } from 'react'
import { Calendar, Plus, Trash2, Loader2, Clock } from 'lucide-react'
import { timetableApi, classesApi, teachersApi } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { Input, Select } from '../../components/common/FormField'
import { DAYS } from '../../utils/helpers'
import toast from 'react-hot-toast'

const EMPTY_FORM = { classId:'', teacherId:'', subject:'', day:'Monday', startTime:'09:00', endTime:'10:00', room:'' }

const DAY_COLORS = {
  Monday   : 'bg-blue-50 border-blue-200',
  Tuesday  : 'bg-purple-50 border-purple-200',
  Wednesday: 'bg-emerald-50 border-emerald-200',
  Thursday : 'bg-amber-50 border-amber-200',
  Friday   : 'bg-rose-50 border-rose-200',
  Saturday : 'bg-slate-50 border-slate-200',
}

export default function AdminTimetable() {
  const [modal,     setModal]     = useState(false)
  const [confirm,   setConfirm]   = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [selClass,  setSelClass]  = useState('')
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)

  const { data: ttData, loading, refetch } = useApi(
    () => timetableApi.list({ classId: selClass || undefined, limit: 200 }),
    [selClass]
  )
  const { data: classData  } = useApi(() => classesApi.list({ limit: 100 }), [])
  const { data: teacherData } = useApi(() => teachersApi.list({ limit: 100 }), [])

  const entries = Array.isArray(ttData)
    ? ttData
    : ttData?.entries ?? []

  const classes = Array.isArray(classData)
    ? classData
    : classData?.classes ?? []

  const teachers = Array.isArray(teacherData)
    ? teacherData
    : teacherData?.teachers ?? []

  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      await timetableApi.create(form)
      toast.success('Timetable entry created')
      setModal(false)
      setForm(EMPTY_FORM)
      refetch()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed – check for scheduling conflicts')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await timetableApi.remove(confirm._id)
      toast.success('Entry removed')
      setConfirm(null); refetch()
    } catch { toast.error('Delete failed') }
    finally { setDeleting(false) }
  }

  // Group by day
  const byDay = DAYS.reduce((acc, d) => {
    acc[d] = entries.filter(e => e.day === d).sort((a, b) => a.startTime.localeCompare(b.startTime))
    return acc
  }, {})

  const classOptions   = classes.map(c => ({ value: c._id, label: `${c.name} – ${c.section}` }))
  const teacherOptions = teachers.map(t => ({
    value: t._id,
    label:
      t.userId?.name ||
      t.user?.name ||
      'Unknown Teacher'
  }))

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select
            value={selClass}
            onChange={(value) => setSelClass(value)}
            options={classOptions}
            placeholder="All Classes"
          />
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex-shrink-0">
          <Plus className="w-4 h-4" /> Add Entry
        </button>
      </div>

      {/* Weekly grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DAYS.slice(0,6).map(d => <div key={d} className="h-40 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {DAYS.map(day => (
            <div key={day} className={`rounded-2xl border-2 ${DAY_COLORS[day]} overflow-hidden`}>
              <div className="px-4 py-3 border-b border-current/20">
                <h3 className="font-bold text-slate-700 text-sm">{day}</h3>
                <p className="text-xs text-slate-400">{byDay[day].length} class{byDay[day].length !== 1 ? 'es' : ''}</p>
              </div>
              <div className="p-3 space-y-2 min-h-20">
                {byDay[day].length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No classes</p>
                ) : (
                  byDay[day].map(entry => (
                    <div key={entry._id} className="bg-white rounded-xl p-3 shadow-sm group flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{entry.subject}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {entry.startTime} – {entry.endTime}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {entry.teacherId?.userId?.name || entry.teacherId?.name || 'Unknown teacher'}
                        </p>
                        {entry.room && <p className="text-xs text-slate-400 truncate">📍 {entry.room}</p>}
                      </div>
                      <button onClick={() => setConfirm(entry)}
                        className="p-1 rounded-lg hover:bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add Timetable Entry" size="md">
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Class"
            value={form.classId}
            onChange={(value) => set('classId')(value)}
            options={classOptions}
            placeholder="Select class"
          />
          <Select
            label="Teacher"
            value={form.teacherId}
            onChange={(value) => set('teacherId')(value)}
            options={teacherOptions}
            placeholder="Select teacher"
          />
          <Input  label="Subject" value={form.subject}   onChange={set('subject')}   placeholder="Data Structures" required />
          <Select label="Day"     value={form.day}       onChange={set('day')}
            options={DAYS.map(d => ({ value: d, label: d }))} />
          <Input label="Start Time" value={form.startTime} onChange={set('startTime')} type="time" required />
          <Input label="End Time"   value={form.endTime}   onChange={set('endTime')}   type="time" required />
          <div className="sm:col-span-2">
            <Input label="Room (optional)" value={form.room} onChange={set('room')} placeholder="Lab-101" />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Entry'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={handleDelete} loading={deleting}
        title="Remove Entry"
        message={`Remove "${confirm?.subject}" on ${confirm?.day} at ${confirm?.startTime}?`}
      />
    </div>
  )
}
