import React, { useState } from 'react'
import { User, Mail, Phone, BookOpen, Hash, Shield, Key, Loader2, CheckCircle } from 'lucide-react'
import { studentApi, authApi } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { fmtDate, initialsAvatar } from '../../utils/helpers'
import toast from 'react-hot-toast'

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-slate-800 mt-0.5">{value || '—'}</p>
      </div>
    </div>
  )
}

export default function StudentProfile() {
  const { user } = useAuth()
  const [pwForm,  setPwForm]  = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)

  const { data: profile, loading } = useApi(() => studentApi.profile(), [])
  const student = profile?.student

  const set = k => v => setPwForm(f => ({ ...f, [k]: v }))

  const handlePasswordChange = async e => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('Passwords do not match')
    if (pwForm.newPassword.length < 8) return toast.error('Password must be at least 8 characters')
    setSaving(true)
    try {
      await authApi.changePassword(pwForm)
      toast.success('Password changed successfully!')
      setSuccess(true)
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile header */}
      <div className="card bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-extrabold flex-shrink-0">
            {initialsAvatar(user?.name)}
          </div>
          <div>
            <h2 className="text-2xl font-extrabold">{user?.name}</h2>
            <p className="text-white/70 mt-0.5">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full capitalize">
                {user?.role}
              </span>
              {student?.rollNumber && (
                <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Roll: {student.rollNumber}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className="card">
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-600" /> Personal Information
        </h3>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />)}
          </div>
        ) : (
          <div>
            <InfoRow icon={User}    label="Full Name"     value={user?.name} />
            <InfoRow icon={Mail}    label="Email"         value={user?.email} />
            <InfoRow icon={Phone}   label="Phone"         value={student?.phone} />
            <InfoRow icon={BookOpen} label="Class"        value={student?.classId ? `${student.classId.name} – Section ${student.classId.section}` : '—'} />
            <InfoRow icon={Hash}    label="Roll Number"   value={student?.rollNumber} />
            <InfoRow icon={User}    label="Section"       value={student?.section} />
            <InfoRow icon={Shield}  label="Guardian"      value={student?.guardianName} />
            <InfoRow icon={Phone}   label="Guardian Phone" value={student?.guardianPhone} />
          </div>
        )}
      </div>

      {/* Academic info */}
      {student?.classId && (
        <div className="card">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" /> Academic Details
          </h3>
          <div>
            <InfoRow icon={BookOpen} label="Class Name"    value={student.classId.name} />
            <InfoRow icon={Hash}     label="Section"       value={student.classId.section} />
            <InfoRow icon={Shield}   label="Academic Year" value={student.classId.academicYear} />
            {student.classId.classTeacher && (
              <InfoRow icon={User}   label="Class Teacher"
                value={student.classId.classTeacher?.userId?.name || 'Not assigned'} />
            )}
          </div>
        </div>
      )}

      {/* Change password */}
      <div className="card">
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-emerald-600" /> Change Password
        </h3>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {[
            { key: 'currentPassword', label: 'Current Password',  placeholder: 'Enter current password' },
            { key: 'newPassword',     label: 'New Password',      placeholder: 'Minimum 8 characters'   },
            { key: 'confirmPassword', label: 'Confirm Password',  placeholder: 'Repeat new password'    },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input
                type="password"
                value={pwForm[key]}
                onChange={e => set(key)(e.target.value)}
                placeholder={placeholder}
                required
                className="input"
              />
            </div>
          ))}
          <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
            {saving   ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> :
             success   ? <><CheckCircle className="w-4 h-4" /> Updated!</>           :
                         'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
