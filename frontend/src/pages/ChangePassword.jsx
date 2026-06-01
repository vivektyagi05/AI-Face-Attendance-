import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../services/api'
import { Lock, Loader2, GraduationCap } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ChangePassword() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)

  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (form.newPassword !== form.confirmPassword) return toast.error('Passwords do not match')
    if (form.newPassword.length < 8) return toast.error('Password must be at least 8 characters')
    setLoading(true)
    try {
      await authApi.changePassword(form)
      toast.success('Password changed! Please log in again.')
      const res = await authApi.changePassword(form)

      localStorage.setItem('token', res.data.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.data.user))

      toast.success('Password changed successfully!')

      window.location.href = '/'
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-8 pt-8 pb-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Change Password</h1>
            <p className="text-white/80 text-sm mt-1">
              {user?.mustChangePassword
                ? 'You must set a new password before continuing'
                : 'Update your account password'}
            </p>
          </div>

          <div className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { key: 'currentPassword', label: 'Current Password',  placeholder: 'Enter current password' },
                { key: 'newPassword',     label: 'New Password',      placeholder: 'Min 8 characters' },
                { key: 'confirmPassword', label: 'Confirm Password',  placeholder: 'Repeat new password' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input
                    type="password"
                    value={form[key]}
                    onChange={e => set(key)(e.target.value)}
                    placeholder={placeholder}
                    required
                    className="input"
                  />
                </div>
              ))}

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 mt-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
