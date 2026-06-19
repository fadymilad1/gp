'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  getSubscription,
  type FeatureKey,
  type PlanType,
  type SubscriptionState,
  type SubscriptionStatus,
} from '@/lib/subscriptionApi'

// ── Types ────────────────────────────────────────────────────────────────────

interface SubscriptionContextValue {
  /** Raw subscription data from the server */
  subscription: SubscriptionState | null
  /** Whether the initial load is still in progress */
  loading: boolean
  /** Error message if the load failed */
  error: string | null
  /** True when the user has an active, unexpired subscription */
  isActive: boolean
  /** Current plan type (defaults to BASIC when inactive) */
  planType: PlanType
  /** Current subscription status */
  subscriptionStatus: SubscriptionStatus
  /** List of feature keys the user can access */
  allowedFeatures: string[]
  /** Whether this user is permitted to publish their hospital website */
  canPublish: boolean
  /** Check whether a specific feature key is unlocked */
  hasFeature: (key: FeatureKey | string) => boolean
  /** Manually refresh subscription state (e.g. after payment) */
  refresh: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null)

// ── Provider ─────────────────────────────────────────────────────────────────

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await getSubscription()
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setSubscription(result.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // Only load for hospital users
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('user')
      if (!raw) return
      const user = JSON.parse(raw) as { businessType?: string; business_type?: string }
      const biz = user.businessType ?? user.business_type ?? ''
      if (biz !== 'hospital') return
    } catch {
      return
    }
    void load()
  }, [load])

  const isActive = subscription?.is_active ?? false
  const planType: PlanType = subscription?.plan_type ?? 'BASIC'
  const subscriptionStatus: SubscriptionStatus = subscription?.subscription_status ?? 'INACTIVE'
  const allowedFeatures: string[] = subscription?.allowed_features ?? []
  const canPublish = subscription?.can_publish ?? false

  const hasFeature = useCallback(
    (key: FeatureKey | string) => allowedFeatures.includes(key),
    [allowedFeatures],
  )

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      subscription,
      loading,
      error,
      isActive,
      planType,
      subscriptionStatus,
      allowedFeatures,
      canPublish,
      hasFeature,
      refresh: load,
    }),
    [
      subscription, loading, error, isActive, planType,
      subscriptionStatus, allowedFeatures, canPublish, hasFeature, load,
    ],
  )

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) {
    throw new Error('useSubscription must be used inside <SubscriptionProvider>')
  }
  return ctx
}
