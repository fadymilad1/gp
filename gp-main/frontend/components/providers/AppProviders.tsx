'use client'

import React from 'react'
import { ToastProvider } from '@/components/ui/ToastProvider'

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <ToastProvider>{children}</ToastProvider>
}
