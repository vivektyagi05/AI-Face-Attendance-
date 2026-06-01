import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar  from './Topbar'
import { LayoutDashboard, ScanFace, Users, Calendar, ClipboardList } from 'lucide-react'

const LINKS = [
  { to: '/teacher',             icon: LayoutDashboard, label: 'Dashboard'     },
  { to: '/teacher/attendance',  icon: ScanFace,        label: 'Take Attendance'},
  { to: '/teacher/students',    icon: Users,           label: 'Students'       },
  { to: '/teacher/sessions',    icon: ClipboardList,   label: 'Sessions'       },
  { to: '/teacher/timetable',   icon: Calendar,        label: 'Timetable'      },
]

export default function TeacherLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar links={LINKS} role="teacher" />
      </div>
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <Sidebar links={LINKS} role="teacher" />
          </div>
        </>
      )}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6"><Outlet /></main>
      </div>
    </div>
  )
}
