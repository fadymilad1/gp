'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { getAuthToken } from '@/lib/api'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const token = getAuthToken()
    const user = localStorage.getItem('user')
    if (!token || !user) {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="flex min-h-screen bg-neutral-light overflow-x-hidden w-full">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 md:ml-64 w-full md:w-auto min-w-0 overflow-x-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 sm:p-6 w-full max-w-full overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}

