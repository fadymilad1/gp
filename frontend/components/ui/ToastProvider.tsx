'use client'

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi'

type ToastType = 'success' | 'error' | 'info'

type ToastItem = {
  id: string
  title: string
  message?: string
  type: ToastType
}

type ToastInput = {
  title: string
  message?: string
  type?: ToastType
  durationMs?: number
}

type ToastContextType = {
  showToast: (payload: ToastInput) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

const classesByType: Record<ToastType, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
}

const iconByType: Record<ToastType, React.ReactNode> = {
  success: <FiCheckCircle className="mt-0.5 shrink-0" />,
  error: <FiAlertCircle className="mt-0.5 shrink-0" />,
  info: <FiInfo className="mt-0.5 shrink-0" />,
}

const createToastId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((payload: ToastInput) => {
    const id = createToastId()
    const next: ToastItem = {
      id,
      title: payload.title,
      message: payload.message,
      type: payload.type || 'info',
    }

    setToasts((prev) => [...prev, next])

    const duration = payload.durationMs ?? 3000
    window.setTimeout(() => hideToast(id), duration)
  }, [hideToast])

  const contextValue = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border p-4 shadow-xl backdrop-blur ${classesByType[toast.type]}`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              {iconByType[toast.type]}
              <div className="flex-1">
                <div className="font-semibold">{toast.title}</div>
                {toast.message ? <p className="mt-1 text-sm opacity-90">{toast.message}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => hideToast(toast.id)}
                className="rounded-md p-1 hover:bg-black/5"
                aria-label="Dismiss notification"
              >
                <FiX />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
