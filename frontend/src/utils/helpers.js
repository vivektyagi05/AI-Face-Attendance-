import { format, parseISO, isValid } from 'date-fns'

export const fmtDate = (d, fmt = 'MMM d, yyyy') => {
  if (!d) return '—'
  try {
    const date = typeof d === 'string' ? parseISO(d) : d
    return isValid(date) ? format(date, fmt) : '—'
  } catch { return '—' }
}

export const fmtDateTime = d => fmtDate(d, 'MMM d, yyyy h:mm a')

export const pctColor = pct => {
  if (pct >= 75) return 'text-emerald-600'
  if (pct >= 50) return 'text-amber-600'
  return 'text-red-600'
}

export const pctBg = pct => {
  if (pct >= 75) return 'bg-emerald-500'
  if (pct >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

export const roleBadge = role => {
  const map = {
    admin  : 'badge-blue',
    teacher: 'badge-amber',
    student: 'badge-green',
  }
  return map[role] || 'badge-blue'
}

export const initialsAvatar = name => {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
export const SECTIONS = ['A','B','C','D','E']
