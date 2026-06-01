import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar  from './Topbar'
import { LayoutDashboard, Users, GraduationCap, BookOpen, Calendar } from 'lucide-react'

const LINKS = [
  { to: '/admin',           icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/admin/teachers',  icon: Users,           label: 'Teachers'   },
  { to: '/admin/students',  icon: GraduationCap,   label: 'Students'   },
  { to: '/admin/classes',   icon: BookOpen,        label: 'Classes'    },
  { to: '/admin/timetable', icon: Calendar,        label: 'Timetable'  },
]

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar links={LINKS} role="admin" />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <Sidebar links={LINKS} role="admin" />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
