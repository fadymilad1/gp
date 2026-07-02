'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OrdersRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/orders')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-light">
      <p className="text-neutral-gray animate-pulse">Redirecting to orders...</p>
    </div>
  )
}
