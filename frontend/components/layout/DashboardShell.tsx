'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { getAuthToken } from '@/lib/api'

export function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const token = getAuthToken()
    const userRaw = localStorage.getItem('user')
    if (!token || !userRaw) {
      router.push('/login')
      return
    }

    try {
      const user = JSON.parse(userRaw)
      const isStaff = user.is_staff || user.is_staff === 'true'
      
      if (isStaff) {
        if (pathname !== '/dashboard/orders') {
          router.replace('/dashboard/orders')
          return
        }
      }
      setAuthorized(true)
    } catch (e) {
      console.error(e)
      router.push('/login')
    }
  }, [router, pathname])

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-light">
        <p className="text-neutral-gray animate-pulse">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full bg-neutral-light">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-w-0 flex-1 w-full md:ml-64 md:w-auto">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="w-full max-w-full p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}