import React, { useState, useCallback } from 'react'
import { Users, Plus, Search, Edit2, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { teachersApi } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { Table, Pagination } from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { Input, Select } from '../../components/common/FormField'
import { fmtDate, initialsAvatar } from '../../utils/helpers'
import toast from 'react-hot-toast'

const EMPTY_FORM = {
  name: '', email: '', password: '', department: '',
  designation: '', employeeId: '', qualification: '', phone: '',
  subjects: '',
}

export default function AdminTeachers() {
  const [page,    setPage]    = useState(1)
  const [search,  setSearch]  = useState('')
  const [modal,   setModal]   = useState(null) // null | 'create' | 'edit'
  const [confirm, setConfirm] = useState(null)
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [deleting,setDeleting]= useState(false)

  const fetchFn = useCallback(
    () => teachersApi.list({ page, limit: 10, search: search || undefined }),
    [page, search]
  )
  const { data, loading, refetch } = useApi(fetchFn, [page, search])

  const teachers = Array.isArray(data) ? data : []

  const pagination = {
    page: 1,
    limit: 10,
    total: teachers.length,
    pages: 1,
    hasNext: false,
    hasPrev: false,
  }

  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  const openCreate = () => { setForm(EMPTY_FORM); setEditing(null); setModal('create') }

  const openEdit = t => {
    setEditing(t)
    setForm({
      name        : t.user?.name        || '',
      email       : t.user?.email       || '',
      password    : '',
      department  : t.department          || '',
      designation : t.designation         || '',
      employeeId  : t.employeeId          || '',
      qualification: t.qualification      || '',
      phone       : t.phone               || '',
      subjects    : (t.subjects || []).join(', '),
    })
    setModal('edit')
  }

  const handleSave = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        subjects: form.subjects ? form.subjects.split(',').map(s => s.trim()).filter(Boolean) : [],
      }
      if (editing) {
        if (!payload.password) delete payload.password
        await teachersApi.update(editing._id, payload)
        toast.success('Teacher updated')
      } else {
        await teachersApi.create(payload)
        toast.success('Teacher created')
      }
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
      await teachersApi.remove(confirm._id)
      toast.success('Teacher deactivated')
      setConfirm(null)
      refetch()
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    {
      key: 'name', label: 'Teacher',
      render: t => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
            {initialsAvatar(t.user?.name)}
          </div>
          <div>
            <p className="font-semibold text-slate-800">{t.user?.name}</p>
            <p className="text-xs text-slate-400">{t.user?.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'department',  label: 'Department',  render: t => t.department  || '—' },
    { key: 'employeeId',  label: 'Emp ID',      render: t => t.employeeId  || '—' },
    { key: 'subjects',    label: 'Subjects',
      render: t => (
        <div className="flex flex-wrap gap-1">
          {(t.subjects || []).slice(0, 3).map(s => (
            <span key={s} className="badge-blue">{s}</span>
          ))}
          {(t.subjects || []).length > 3 && <span className="badge-blue">+{t.subjects.length - 3}</span>}
        </div>
      ),
    },
    {
      key: 'status', label: 'Status',
      render: t => t.user?.isActive
        ? <span className="badge-green"><CheckCircle className="w-3 h-3" /> Active</span>
        : <span className="badge-red"><XCircle className="w-3 h-3" /> Inactive</span>,
    },
    {
      key: 'actions', label: 'Actions',
      render: t => (
        <div className="flex items-center gap-2">
          <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => setConfirm(t)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search teachers…"
            className="input pl-9"
          />
        </div>
        <button onClick={openCreate} className="btn-primary flex-shrink-0">
          <Plus className="w-4 h-4" /> Add Teacher
        </button>
      </div>

      {/* Table */}
      <div className="card p-0">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-800">Teachers</h2>
          {pagination.total != null && (
            <span className="ml-auto text-sm text-slate-400">{pagination.total} total</span>
          )}
        </div>
        <div className="p-4">
          <Table columns={columns} rows={teachers} loading={loading} emptyMsg="No teachers found" />
          <Pagination {...pagination} onPage={setPage} />
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={editing ? 'Edit Teacher' : 'Add New Teacher'}
        size="lg"
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Full Name"    value={form.name}         onChange={set('name')}         placeholder="Dr. John Smith" required />
          <Input label="Email"        value={form.email}        onChange={set('email')}        placeholder="teacher@college.edu" type="email" required={!editing} />
          <Input label={editing ? 'New Password (leave blank to keep)' : 'Temporary Password'} value={form.password} onChange={set('password')} placeholder="Min 8 chars" type="password" required={!editing} />
          <Input label="Employee ID"  value={form.employeeId}   onChange={set('employeeId')}   placeholder="EMP001" />
          <Input label="Department"   value={form.department}   onChange={set('department')}   placeholder="Computer Science" />
          <Input label="Designation"  value={form.designation}  onChange={set('designation')}  placeholder="Associate Professor" />
          <Input label="Qualification" value={form.qualification} onChange={set('qualification')} placeholder="Ph.D Computer Science" />
          <Input label="Phone"        value={form.phone}        onChange={set('phone')}        placeholder="+91 9876543210" />
          <div className="sm:col-span-2">
            <Input label="Subjects (comma-separated)" value={form.subjects} onChange={set('subjects')} placeholder="Data Structures, Algorithms, OS" />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : saving ? '' : editing ? 'Update Teacher' : 'Create Teacher'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Deactivate Teacher"
        message={`Are you sure you want to deactivate ${confirm?.user?.name}? They will lose access to the system.`}
      />
    </div>
  )
}
