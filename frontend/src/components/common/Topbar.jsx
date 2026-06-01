import React from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Menu } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { initialsAvatar } from '../../utils/helpers'

const pageTitles = {
  '/admin'           : 'Dashboard',
  '/admin/teachers'  : 'Manage Teachers',
  '/admin/students'  : 'Manage Students',
  '/admin/classes'   : 'Manage Classes',
  '/admin/timetable' : 'Timetable',
  '/teacher'         : 'Dashboard',
  '/teacher/attendance': 'Take Attendance',
  '/teacher/students': 'Students',
  '/teacher/timetable': 'Timetable',
  '/teacher/sessions': 'Attendance Sessions',
  '/student'         : 'Dashboard',
  '/student/attendance': 'My Attendance',
  '/student/timetable': 'My Timetable',
  '/student/profile' : 'Profile',
}

export default function Topbar({ onMenuClick }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const title = pageTitles[pathname] || 'SmartAttend'

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-slate-800">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
            {initialsAvatar(user?.name)}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-700 leading-none">{user?.name}</p>
            <p className="text-xs text-slate-400 capitalize mt-0.5">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
