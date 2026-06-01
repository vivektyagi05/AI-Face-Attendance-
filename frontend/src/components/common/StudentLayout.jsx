import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar  from './Topbar'
import { LayoutDashboard, BarChart2, Calendar, User } from 'lucide-react'

const LINKS = [
  { to: '/student',             icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/student/attendance',  icon: BarChart2,       label: 'Attendance'  },
  { to: '/student/timetable',   icon: Calendar,        label: 'Timetable'   },
  { to: '/student/profile',     icon: User,            label: 'Profile'     },
]

export default function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar links={LINKS} role="student" />
      </div>
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <Sidebar links={LINKS} role="student" />
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
