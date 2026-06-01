import React, { useState, useCallback } from 'react'
import { BookOpen, Plus, Edit2, Trash2, Loader2, Users, UserCheck } from 'lucide-react'
import { classesApi, teachersApi, studentsApi } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { Input, Select } from '../../components/common/FormField'
import { fmtDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

const EMPTY_FORM = { name: '', section: 'A', academicYear: '2024-2025', description: '' }
const SECTIONS   = ['A','B','C','D','E']

export default function AdminClasses() {
  const [modal,     setModal]     = useState(null)
  const [confirm,   setConfirm]   = useState(null)
  const [assignT,   setAssignT]   = useState(null) // { classId, classDoc }
  const [assignS,   setAssignS]   = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [editing,   setEditing]   = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)
  const [selTeacher, setSelTeacher] = useState('')
  const [selStudents, setSelStudents] = useState([])

  const { data, loading, refetch } = useApi(() => classesApi.list({ limit: 50 }), [])
  const { data: teacherData } = useApi(() => teachersApi.list({ limit: 100 }), [])
  const { data: studentData } = useApi(() => studentsApi.list({ limit: 200 }), [])

  const classes = Array.isArray(data?.data)
  ? data.data
  : Array.isArray(data)
    ? data
    : []

const teachers = Array.isArray(teacherData?.data)
  ? teacherData.data
  : Array.isArray(teacherData)
    ? teacherData
    : []

const students = Array.isArray(studentData?.data)
  ? studentData.data
  : Array.isArray(studentData)
    ? studentData
    : []

  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  const openCreate = () => { setForm(EMPTY_FORM); setEditing(null); setModal('form') }
  const openEdit   = c => {
    setEditing(c)
    setForm({ name: c.name, section: c.section, academicYear: c.academicYear, description: c.description || '' })
    setModal('form')
  }

  const handleSave = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) await classesApi.update(editing._id, form)
      else         await classesApi.create(form)
      toast.success(editing ? 'Class updated' : 'Class created')
      setModal(null); refetch()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await classesApi.remove(confirm._id)
      toast.success('Class deactivated')
      setConfirm(null); refetch()
    } catch { toast.error('Delete failed') }
    finally { setDeleting(false) }
  }

  const handleAssignTeacher = async () => {
    if (!selTeacher) return toast.error('Select a teacher')
    setSaving(true)
    try {
      await classesApi.assignTeacher(assignT._id, { teacherId: selTeacher })
      toast.success('Class teacher assigned')
      setAssignT(null); setSelTeacher(''); refetch()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handleAssignStudents = async () => {
    if (!selStudents.length) return toast.error('Select at least one student')
    setSaving(true)
    try {
      await classesApi.assignStudents(assignS._id, { studentIds: selStudents })
      toast.success(`${selStudents.length} student(s) enrolled`)
      setAssignS(null); setSelStudents([]); refetch()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const toggleStudent = id =>
    setSelStudents(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const teacherOptions = teachers.map(t => ({
  value: t._id,
  label: `${
    t.userId?.name ||
    t.user?.name ||
    'Unknown Teacher'
  } (${t.department || 'N/A'})`,
}))

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Create Class
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="card h-40 animate-pulse bg-slate-100" />)}
        </div>
      ) : classes.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No classes yet</p>
          <p className="text-sm text-slate-400 mt-1">Create your first class to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {classes.map(c => (
            <div key={c._id} className="card space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">{c.name}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Section {c.section} · {c.academicYear}</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setConfirm(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 font-medium">Class Teacher</p>
                  <p className="font-semibold text-slate-700 truncate mt-0.5">
                    {
                      c.classTeacher?.userId?.name ||
                      c.classTeacher?.user?.name ||
                      'Not assigned'
                    }
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 font-medium">Students</p>
                  <p className="font-bold text-2xl text-slate-800">{c.studentCount ?? c.students?.length ?? 0}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setAssignT(c); setSelTeacher('') }} className="flex-1 btn-secondary text-xs py-2">
                  <UserCheck className="w-3.5 h-3.5" /> Assign Teacher
                </button>
                <button onClick={() => { setAssignS(c); setSelStudents([]) }} className="flex-1 btn-secondary text-xs py-2">
                  <Users className="w-3.5 h-3.5" /> Enroll Students
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit */}
      <Modal open={modal === 'form'} onClose={() => setModal(null)}
        title={editing ? 'Edit Class' : 'Create Class'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Class Name" value={form.name} onChange={set('name')} placeholder="B.Tech CSE" required />
          <Select label="Section" value={form.section} onChange={set('section')}
            options={SECTIONS.map(s => ({ value: s, label: `Section ${s}` }))} />
          <Input label="Academic Year" value={form.academicYear} onChange={set('academicYear')} placeholder="2024-2025" required />
          <Input label="Description (optional)" value={form.description} onChange={set('description')} placeholder="First year batch" />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Teacher */}
      <Modal open={!!assignT} onClose={() => setAssignT(null)} title={`Assign Teacher – ${assignT?.name}`} size="sm">
        <div className="space-y-4">
          <Select
            label="Select Teacher"
            value={selTeacher}
            onChange={setSelTeacher}
            options={teacherOptions} placeholder="Choose a teacher" />
          <div className="flex justify-end gap-3">
            <button onClick={() => setAssignT(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleAssignTeacher} disabled={saving || !selTeacher} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Enroll Students */}
      <Modal open={!!assignS} onClose={() => setAssignS(null)}
        title={`Enroll Students – ${assignS?.name}`} size="md">
        <div className="space-y-3">
          <p className="text-sm text-slate-500">{selStudents.length} selected</p>
          <div className="max-h-72 overflow-y-auto space-y-1.5">
            {students.map(s => {
              const checked = selStudents.includes(s._id)
              const alreadyEnrolled = (assignS?.students || []).some(id => (id._id || id) === s._id)
              return (
                <label key={s._id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition ${
                    alreadyEnrolled ? 'opacity-40 cursor-not-allowed' : checked ? 'bg-primary-50' : 'hover:bg-slate-50'
                  }`}>
                  <input type="checkbox" checked={checked} disabled={alreadyEnrolled}
                    onChange={() => !alreadyEnrolled && toggleStudent(s._id)}
                    className="w-4 h-4 rounded accent-primary-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.userId?.name}</p>
                    <p className="text-xs text-slate-400">{s.rollNumber} · {s.userId?.email}</p>
                  </div>
                  {alreadyEnrolled && <span className="ml-auto badge-green text-xs">Enrolled</span>}
                </label>
              )
            })}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setAssignS(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleAssignStudents} disabled={saving || !selStudents.length} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : `Enroll ${selStudents.length}`}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={handleDelete} loading={deleting}
        title="Deactivate Class"
        message={`Deactivate "${confirm?.name} – ${confirm?.section}"?`}
      />
    </div>
  )
}
