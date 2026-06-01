import React, { useState, useCallback } from 'react'
import { GraduationCap, Plus, Search, Edit2, Trash2, ScanFace, Loader2, CheckCircle, XCircle, Upload, X } from 'lucide-react'
import { studentsApi, classesApi, attendanceApi } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { Table, Pagination } from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { Input, Select } from '../../components/common/FormField'
import { initialsAvatar, SECTIONS } from '../../utils/helpers'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

const EMPTY_FORM = { name:'', email:'', password:'', rollNumber:'', classId:'', section:'A', phone:'', guardianName:'' }

function FaceRegisterModal({ student, onClose, onDone }) {
  const [files,   setFiles]   = useState([])
  const [loading, setLoading] = useState(false)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 5,
    onDrop: accepted => setFiles(prev => [...prev, ...accepted].slice(0, 5)),
  })

  const removeFile = i => setFiles(f => f.filter((_, idx) => idx !== i))

  const handleSubmit = async () => {
    if (files.length < 3) return toast.error('Upload at least 3 face images')
    setLoading(true)
    try {
      const fd = new FormData()
      files.forEach(f => fd.append('images', f))
      await attendanceApi.registerFace(student._id, fd)
      toast.success('Face registered successfully!')
      onDone(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Face registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`Register Face – ${student.userId?.name}`} size="md">
      <div className="space-y-4">
        <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700 font-medium">
          📸 Upload 3–5 clear, well-lit face photos. Use different angles for best accuracy.
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-primary-300'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">
            {isDragActive ? 'Drop images here' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-xs text-slate-400 mt-1">JPEG, PNG, WebP · Max 5 images · 10 MB each</p>
        </div>

        {files.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 group">
                <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs text-center py-0.5">
                  {i + 1}/{files.length}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-500">{files.length}/5 images selected (min 3)</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={loading || files.length < 3} className="btn-primary">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : 'Register Face'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default function AdminStudents() {
  const [page,      setPage]      = useState(1)
  const [search,    setSearch]    = useState('')
  const [modal,     setModal]     = useState(null)
  const [confirm,   setConfirm]   = useState(null)
  const [faceModal, setFaceModal] = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [editing,   setEditing]   = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)

  const fetchStudents = useCallback(
    () => studentsApi.list({ page, limit: 10, search: search || undefined }),
    [page, search]
  )
const { data, loading, refetch } = useApi(fetchStudents, [page, search])

const { data: classData } = useApi(
  () => classesApi.list({ limit: 100 }),
  []
)
const students = Array.isArray(data) ? data : []

const pagination = {
  page: 1,
  limit: 10,
  total: students.length,
  pages: 1,
  hasNext: false,
  hasPrev: false,
}

const classes = Array.isArray(classData) ? classData : []

  

  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  const openCreate = () => { setForm(EMPTY_FORM); setEditing(null); setModal('create') }
  const openEdit   = s => {
    setEditing(s)
    setForm({
      name        : s.userId?.name  || '',
      email       : s.userId?.email || '',
      password    : '',
      rollNumber  : s.rollNumber    || '',
      classId     : s.classId?._id  || '',
      section     : s.section       || 'A',
      phone       : s.phone         || '',
      guardianName: s.guardianName  || '',
    })
    setModal('edit')
  }

  const handleSave = async e => {
    e.preventDefault()
    setSaving(true)
    console.log("FINAL FORM:", form)
    try {
      const payload = { ...form }
      if (editing && !payload.password) delete payload.password
      if (editing) await studentsApi.update(editing._id, payload)
      else         await studentsApi.create(payload)
      toast.success(editing ? 'Student updated' : 'Student created')
      setModal(null)
      refetch()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await studentsApi.remove(confirm._id)
      toast.success('Student deactivated')
      setConfirm(null)
      refetch()
    } catch { toast.error('Delete failed') }
    finally { setDeleting(false) }
  }

  const classOptions = classes.map(c => ({
    value: c._id,
    label: `${c.name} – ${c.section} (${c.academicYear})`,
  }))

  const columns = [
    {
      key: 'student', label: 'Student',
      render: s => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
            {initialsAvatar(s.userId?.name)}
          </div>
          <div>
            <p className="font-semibold text-slate-800">{s.userId?.name}</p>
            <p className="text-xs text-slate-400">{s.userId?.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'rollNumber', label: 'Roll No.', render: s => <span className="badge-blue">{s.rollNumber}</span> },
    { key: 'class', label: 'Class', render: s => s.classId ? `${s.classId.name} – ${s.classId.section}` : '—' },
    { key: 'section', label: 'Section', render: s => s.section || '—' },
    {
      key: 'face', label: 'Face',
      render: s => s.faceRegistered
        ? <span className="badge-green"><CheckCircle className="w-3 h-3" /> Registered</span>
        : <span className="badge-amber"><XCircle className="w-3 h-3" /> Not Set</span>,
    },
    {
      key: 'actions', label: 'Actions',
      render: s => (
        <div className="flex items-center gap-1.5">
          <button onClick={() => setFaceModal(s)} title="Register Face"
            className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 transition">
            <ScanFace className="w-4 h-4" />
          </button>
          <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => setConfirm(s)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search students…" className="input pl-9" />
        </div>
        <button onClick={openCreate} className="btn-primary flex-shrink-0">
          <Plus className="w-4 h-4" /> Add Student
        </button>
      </div>

      <div className="card p-0">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-800">Students</h2>
          <span className="ml-auto text-sm text-slate-400">{pagination.total ?? 0} total</span>
        </div>
        <div className="p-4">
          <Table columns={columns} rows={students} loading={loading} emptyMsg="No students found" />
          <Pagination {...pagination} onPage={setPage} />
        </div>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)}
        title={editing ? 'Edit Student' : 'Add New Student'} size="lg">
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Full Name"   value={form.name}      onChange={set('name')}      placeholder="Rahul Verma" required />
          <Input label="Email"       value={form.email}     onChange={set('email')}     placeholder="student@edu.com" type="email" required={!editing} />
          <Input label={editing ? 'New Password (leave blank to keep)' : 'Temp Password'} value={form.password} onChange={set('password')} type="password" placeholder="Min 8 chars" required={!editing} />
          <Input label="Roll Number" value={form.rollNumber} onChange={set('rollNumber')} placeholder="CS001" required />
          <div className="sm:col-span-2">
            <Select
              label="Class"
              value={form.classId}
              onChange={set('classId')}
              options={classOptions}
              placeholder="Select class"
            />
          </div>
          <Select
            label="Section"
            value={form.section}
            onChange={set('section')}
            options={SECTIONS.map(s => ({ value: s, label: s }))} />
          <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="+91 9876543210" />
          <div className="sm:col-span-2">
            <Input label="Guardian Name" value={form.guardianName} onChange={set('guardianName')} placeholder="Parent / Guardian" />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : editing ? 'Update' : 'Create Student'}
            </button>
          </div>
        </form>
      </Modal>

      {faceModal && (
        <FaceRegisterModal
          student={faceModal}
          onClose={() => setFaceModal(null)}
          onDone={refetch}
        />
      )}

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={handleDelete} loading={deleting}
        title="Deactivate Student"
        message={`Deactivate ${confirm?.userId?.name}? They will lose access.`}
      />
    </div>
  )
}
