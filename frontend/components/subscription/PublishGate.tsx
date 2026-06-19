'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { FiAlertCircle, FiArrowUpRight, FiX, FiGlobe } from 'react-icons/fi'

interface PublishGateProps {
  /** Whether the user is allowed to publish */
  canPublish: boolean
  /** Called when user confirms publish (only fires if canPublish=true) */
  onPublish?: () => void
  /** Optional custom label */
  label?: string
  className?: string
}

/**
 * Smart publish button:
 * - If canPublish=true  → acts as a normal button / link and calls onPublish
 * - If canPublish=false → shows a modal explaining the subscription requirement
 */
export function PublishGate({ canPublish, onPublish, label = 'Publish / Update Website', className = '' }: PublishGateProps) {
  const [gateOpen, setGateOpen] = useState(false)

  const handleClick = () => {
    if (canPublish) {
      onPublish?.()
    } else {
      setGateOpen(true)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`
          inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold
          shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
          ${canPublish
            ? 'bg-primary text-white hover:bg-primary-dark'
            : 'bg-neutral-light text-neutral-gray border border-neutral-border cursor-pointer hover:border-primary hover:text-primary'
          }
          ${className}
        `}
      >
        <FiGlobe size={15} />
        {label}
        {!canPublish && (
          <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <FiAlertCircle size={11} />
          </span>
        )}
      </button>

      {/* Subscription-required gate modal */}
      {gateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setGateOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-8 text-center"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="publish-gate-title"
          >
            {/* Close */}
            <button
              type="button"
              onClick={() => setGateOpen(false)}
              className="absolute top-4 right-4 text-neutral-gray hover:text-neutral-dark transition-colors"
              aria-label="Close"
            >
              <FiX size={20} />
            </button>

            {/* Icon */}
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 border border-blue-200">
              <FiGlobe className="text-primary" size={28} />
            </div>

            <h2 id="publish-gate-title" className="text-xl font-bold text-neutral-dark mb-2">
              Subscription Required
            </h2>

            <p className="text-sm text-neutral-gray leading-relaxed mb-6">
              You need an active subscription or purchased plan to publish your hospital website.
              Please upgrade your plan to continue.
            </p>

            <div className="flex flex-col gap-3">
              <Link
                href="/dashboard/hospital/setup"
                onClick={() => setGateOpen(false)}
                className="
                  flex items-center justify-center gap-2 rounded-xl
                  bg-primary px-6 py-3 text-sm font-semibold text-white
                  hover:bg-primary-dark transition-colors shadow-sm
                "
              >
                <FiArrowUpRight size={16} />
                Upgrade Now
              </Link>
              <Link
                href="/dashboard/hospital/setup"
                onClick={() => setGateOpen(false)}
                className="
                  flex items-center justify-center gap-2 rounded-xl
                  border border-neutral-border px-6 py-3 text-sm font-semibold text-neutral-dark
                  hover:bg-neutral-light transition-colors
                "
              >
                View Plans
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
