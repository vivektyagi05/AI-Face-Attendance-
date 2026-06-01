import React, { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GraduationCap, Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm]       = useState({ email: '', password: '', role: 'admin' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to={`/${user.role}`} replace />

  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.email || !form.password) return toast.error('Please fill all fields')
    setLoading(true)
    try {
      const u = await login(form.email, form.password, form.role)
      if (u.mustChangePassword) {
        toast.success('Please change your temporary password')
        navigate('/change-password')
      } else {
        toast.success(`Welcome, ${u.name}!`)
        navigate(`/${u.role}`)
      }
    } catch (err) {
      // toast already shown by interceptor
    } finally {
      setLoading(false)
    }
  }

  const ROLES = [
    { value: 'admin',   label: '👑 Administrator' },
    { value: 'teacher', label: '👨‍🏫 Teacher'       },
    { value: 'student', label: '🎓 Student'        },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-indigo-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white/5"
            style={{
              width: `${150 + i * 80}px`, height: `${150 + i * 80}px`,
              top: `${10 + i * 15}%`, left: `${5 + i * 12}%`,
              transform: 'translate(-50%, -50%)',
            }} />
        ))}
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-700 to-indigo-700 px-8 pt-10 pb-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">SmartAttend</h1>
            <p className="text-white/70 text-sm mt-1">AI-Powered Attendance Platform</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Sign In</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role selector */}
              <div>
                <label className="label">Login As</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => set('role')(r.value)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                        form.role === r.value
                          ? 'bg-primary-600 border-primary-600 text-white shadow-md'
                          : 'border-slate-200 text-slate-600 hover:border-primary-300'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email')(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="input"
                />
              </div>

              {/* Password */}
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => set('password')(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 mt-2">
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing In…</>
                  : 'Sign In'
                }
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
