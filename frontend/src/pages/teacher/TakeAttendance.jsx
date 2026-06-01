import React, { useState, useCallback } from 'react'
import {
  ScanFace, Upload, Loader2, CheckCircle, XCircle,
  BarChart2, AlertTriangle, RefreshCw, X, Eye
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { teacherApi, attendanceApi } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { Select, Input } from '../../components/common/FormField'
import Modal from '../../components/common/Modal'
import { fmtDate, fmtDateTime, pctColor, pctBg } from '../../utils/helpers'
import toast from 'react-hot-toast'

// ── Dropzone component ────────────────────────────────────────
function ImageDropzone({ file, onDrop, onClear }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    onDrop: useCallback(accepted => accepted[0] && onDrop(accepted[0]), [onDrop]),
  })

  if (file) return (
    <div className="relative rounded-2xl overflow-hidden border-2 border-primary-200 bg-primary-50">
      <img src={URL.createObjectURL(file)} alt="Classroom" className="w-full max-h-64 object-contain" />
      <button onClick={onClear}
        className="absolute top-2 right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white shadow-md">
        <X className="w-4 h-4" />
      </button>
      <div className="px-4 py-2 bg-white border-t border-primary-100">
        <p className="text-xs text-slate-500 truncate">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>
      </div>
    </div>
  )

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
        isDragActive ? 'border-primary-400 bg-primary-50 scale-[1.02]' : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
      }`}
    >
      <input {...getInputProps()} />
      <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Upload className="w-8 h-8 text-primary-600" />
      </div>
      <p className="text-base font-semibold text-slate-700">
        {isDragActive ? 'Drop the classroom photo here' : 'Upload classroom photo'}
      </p>
      <p className="text-sm text-slate-400 mt-1">Drag & drop or click to browse · JPEG, PNG, WebP · Max 10 MB</p>
    </div>
  )
}

// ── Result row ────────────────────────────────────────────────
function RecordRow({ record, onOverride }) {
  const isPresent = record.status === 'present'
  const conf = record.confidenceScore ? Math.round(record.confidenceScore * 100) : null

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition ${
      isPresent ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'
    }`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isPresent ? 'bg-emerald-100' : 'bg-slate-200'
      }`}>
        {isPresent
          ? <CheckCircle className="w-4 h-4 text-emerald-600" />
          : <XCircle     className="w-4 h-4 text-slate-400"   />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isPresent ? 'text-slate-800' : 'text-slate-500'}`}>
          {record.userId?.name || record.studentId?.rollNumber || 'Unknown'}
        </p>
        <p className="text-xs text-slate-400">
          {record.studentId?.rollNumber}
          {record.markedBy === 'face_recognition' && conf != null && ` · ${conf}% match`}
          {record.markedBy === 'manual_override'  && ' · Manual'}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={isPresent ? 'badge-green' : 'badge-red'}>
          {isPresent ? 'Present' : 'Absent'}
        </span>
        <button
          onClick={() => onOverride(record, isPresent ? 'absent' : 'present')}
          className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition"
          title="Toggle status"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
export default function TakeAttendance() {
  const [step,       setStep]       = useState(1)  // 1=setup, 2=upload, 3=results
  const [form,       setForm]       = useState({ classId:'', subject:'', date: new Date().toISOString().split('T')[0], startTime:'', endTime:'', confidenceThreshold:'0.55' })
  const [image,      setImage]      = useState(null)
  const [processing, setProcessing] = useState(false)
  const [session,    setSession]    = useState(null)
  const [overriding, setOverriding] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const { data: classData } = useApi(() => teacherApi.classes(), [])
  const classes = classData?.classes ?? []
  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  const classOptions = classes.map(c => ({
    value: c._id,
    label: `${c.name} – Section ${c.section}`,
  }))

  const handleProcess = async () => {
    if (!form.classId) return toast.error('Select a class')
    if (!image)        return toast.error('Upload a classroom photo')
    setProcessing(true)
    try {
      const fd = new FormData()
      fd.append('classroomImage', image)
      fd.append('classId',            form.classId)
      fd.append('subject',            form.subject || 'General')
      fd.append('date',               form.date)
      fd.append('startTime',          form.startTime)
      fd.append('endTime',            form.endTime)
      fd.append('confidenceThreshold', form.confidenceThreshold)

      const res = await attendanceApi.take(fd)
      setSession(res.data.data?.session || res.data.session)
      setStep(3)
      toast.success('Attendance processed successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Processing failed')
    } finally {
      setProcessing(false)
    }
  }

  const handleOverride = async (record, newStatus) => {
    if (overriding) return
    setOverriding(record.studentId?._id || record._id)
    try {
      const res = await attendanceApi.override(session._id, {
        studentId: record.studentId?._id || record.studentId,
        status: newStatus,
      })
      setSession(res.data.data?.session || res.data.session)
      toast.success(`Marked ${newStatus}`)
    } catch { toast.error('Override failed') }
    finally   { setOverriding(null) }
  }

  const handleReset = () => {
    setStep(1); setImage(null); setSession(null)
    setForm({ ...form, subject:'', startTime:'', endTime:'' })
  }

  const pct = session ? Math.round(session.presentCount / session.totalStudents * 100) : 0
  const present = session?.records?.filter(r => r.status === 'present') ?? []
  const absent  = session?.records?.filter(r => r.status === 'absent')  ?? []

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-3">
        {[
          { n: 1, label: 'Setup'   },
          { n: 2, label: 'Capture' },
          { n: 3, label: 'Results' },
        ].map(({ n, label }, i, arr) => (
          <React.Fragment key={n}>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                n < step  ? 'bg-emerald-500 text-white'    :
                n === step ? 'bg-primary-600 text-white'   :
                             'bg-slate-100 text-slate-400'
              }`}>
                {n < step ? <CheckCircle className="w-4 h-4" /> : n}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${n === step ? 'text-primary-700' : 'text-slate-400'}`}>
                {label}
              </span>
            </div>
            {i < arr.length - 1 && (
              <div className={`flex-1 h-0.5 ${n < step ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── Step 1: Setup ── */}
      {step === 1 && (
        <div className="card space-y-5">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ScanFace className="w-5 h-5 text-primary-600" /> Session Setup
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Select label="Class *" value={form.classId} onChange={set('classId')}
                options={classOptions} placeholder="Select class" />
            </div>
            <Input label="Subject" value={form.subject} onChange={set('subject')} placeholder="e.g. Data Structures" />
            <Input label="Date *"  value={form.date}    onChange={set('date')}    type="date" required />
            <Input label="Start Time" value={form.startTime} onChange={set('startTime')} type="time" />
            <Input label="End Time"   value={form.endTime}   onChange={set('endTime')}   type="time" />
            <div>
              <label className="label">Confidence Threshold</label>
              <input type="range" min="0.3" max="0.9" step="0.05"
                value={parseFloat(form.confidenceThreshold)}
                onChange={e => set('confidenceThreshold')(e.target.value)}
                className="w-full accent-primary-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Lenient (0.3)</span>
                <span className="font-semibold text-primary-600">{parseFloat(form.confidenceThreshold).toFixed(2)}</span>
                <span>Strict (0.9)</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => setStep(2)} disabled={!form.classId || !form.date}
              className="btn-primary">
              Next: Upload Photo →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Upload ── */}
      {step === 2 && (
        <div className="card space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary-600" /> Upload Classroom Photo
            </h2>
            <button onClick={() => setStep(1)} className="text-sm text-slate-400 hover:text-slate-600">
              ← Back
            </button>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 font-medium">
            📸 Tips: ensure good lighting, all faces visible, minimal blur. The AI will detect and match all visible students.
          </div>

          <ImageDropzone file={image} onDrop={setImage} onClear={() => setImage(null)} />

          <div className="flex justify-end gap-3">
            <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
            <button
              onClick={handleProcess}
              disabled={!image || processing}
              className="btn-primary"
            >
              {processing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                : <><ScanFace className="w-4 h-4" /> Process Attendance</>
              }
            </button>
          </div>

          {processing && (
            <div className="mt-4 p-4 bg-primary-50 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                <p className="text-sm font-semibold text-primary-700">AI is processing the image…</p>
              </div>
              <div className="w-full h-1.5 bg-primary-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-600 rounded-full animate-pulse w-3/4" />
              </div>
              <p className="text-xs text-primary-500 mt-1">Detecting faces · Matching students · Marking attendance</p>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Results ── */}
      {step === 3 && session && (
        <div className="space-y-4">
          {/* Summary card */}
          <div className="card bg-gradient-to-r from-primary-600 to-indigo-700 text-white p-0 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white/70 text-sm">Attendance Result</p>
                  <h2 className="text-xl font-bold">{session.subject} · {session.classId?.name}</h2>
                  <p className="text-white/60 text-sm mt-0.5">{fmtDate(session.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-extrabold">{pct}%</p>
                  <p className="text-white/70 text-sm">{session.presentCount}/{session.totalStudents} present</p>
                </div>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/10 bg-black/10">
              {[
                { label: 'Present',   value: session.presentCount,    icon: CheckCircle },
                { label: 'Absent',    value: session.absentCount,     icon: XCircle     },
                { label: 'AI Matched', value: session.recognizedCount, icon: ScanFace   },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="py-3 text-center">
                  <p className="text-lg font-bold">{value}</p>
                  <p className="text-white/60 text-xs">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {session.unknownFaces > 0 && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {session.unknownFaces} unrecognised face{session.unknownFaces > 1 ? 's' : ''} detected
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  These faces weren't matched to any registered student. Check if all students have registered face data.
                </p>
              </div>
            </div>
          )}

          {/* Present students */}
          {present.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> Present ({present.length})
              </h3>
              <div className="space-y-2">
                {present.map((r, i) => (
                  <RecordRow key={r._id || i} record={r} onOverride={handleOverride} />
                ))}
              </div>
            </div>
          )}

          {/* Absent students */}
          {absent.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" /> Absent ({absent.length})
              </h3>
              <div className="space-y-2">
                {absent.map((r, i) => (
                  <RecordRow key={r._id || i} record={r} onOverride={handleOverride} />
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button onClick={handleReset} className="btn-secondary">
              <RefreshCw className="w-4 h-4" /> New Session
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
