'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { PaymentModal } from '@/components/payment/PaymentModal'
import { FiDollarSign, FiCheckCircle, FiZap } from 'react-icons/fi'
import { getScopedItem, setScopedItem } from '@/lib/storage'
import { websiteSetupApiV2 } from '@/lib/api'
import {
  activateSubscription,
  updateSubscription,
  PLAN_LABELS,
  PLAN_BADGE_CLASSES,
  type PlanType,
} from '@/lib/subscriptionApi'
import { SubscriptionProvider, useSubscription } from '@/contexts/SubscriptionContext'

type FeatureState = {
  plan: 'basic' | 'standard'
  customTheme: boolean
  brandingSetup: boolean
}

const DEFAULT_FORM_STATE: FeatureState = {
  plan: 'basic',
  customTheme: false,
  brandingSetup: false,
}

const PLANS = [
  {
    key: 'basic' as const,
    backendKey: 'BASIC' as PlanType,
    label: 'Basic Plan',
    setupPrice: 0,
    monthlyPrice: 9,
    features: [
      'Hospital website',
      'Doctors & departments',
      'Review system',
      'Basic contact forms',
      'Appointment system',
    ],
  },
  {
    key: 'standard' as const,
    backendKey: 'STANDARD' as PlanType,
    label: 'Standard Plan',
    setupPrice: 0,
    monthlyPrice: 29,
    features: [
      'Everything in Basic',
      'Patient Portal',
      'Medical Q&A chatbot',
      'Prescription refill (included)',
    ],
  },
]

const ADD_ONS = [
  {
    key: 'customTheme' as const,
    label: 'Custom UI Theme',
    description: 'Apply a custom UI theme to match your brand',
    price: 29,
    planFeature: 'custom_theme',
  },
  {
    key: 'brandingSetup' as const,
    label: 'Branding Setup',
    description: 'Full branding setup across your hospital website',
    price: 49,
    planFeature: 'branding_setup',
  },
]

const resolvePlanKey = (payload: {
  _plan?: string
  plan?: string
  aiChatbot?: boolean
  patientPortal?: boolean
  prescriptionRefill?: boolean
} | null) => {
  if (!payload) return 'basic' as const
  if (payload._plan === 'standard' || payload.plan === 'standard') return 'standard' as const
  if (payload._plan === 'basic' || payload.plan === 'basic') return 'basic' as const
  if (payload.aiChatbot || payload.patientPortal || payload.prescriptionRefill) return 'standard' as const
  return 'basic' as const
}

const buildStoredFeatures = (state: FeatureState) => ({
  _plan: state.plan,
  reviewSystem: true,
  aiChatbot: state.plan === 'standard',
  patientPortal: state.plan === 'standard',
  prescriptionRefill: state.plan === 'standard',
  customTheme: state.customTheme,
  brandingSetup: state.brandingSetup,
})

// ── Inner component ──────────────────────────────────────────────────────────

function HospitalSetupContent() {
  const router = useRouter()
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [userType, setUserType] = useState<'hospital' | 'pharmacy'>('hospital')
  const [formData, setFormData] = useState<FeatureState>(DEFAULT_FORM_STATE)
  const [isHydrated, setIsHydrated] = useState(false)
  const [activating, setActivating] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)

  const { planType, isActive, subscriptionStatus, loading: subLoading, refresh } = useSubscription()

  // Map backend plan type to local key for highlighting
  const activePlanKey = planType === 'STANDARD' ? 'standard' : 'basic'
  const hasPendingSubscription = subscriptionStatus === 'PENDING'
  const hasLockedSubscription = isActive || hasPendingSubscription
  const blockMessage = hasLockedSubscription
    ? isActive
      ? activePlanKey === formData.plan
        ? 'You already have an active subscription.'
        : 'Cancel your current plan before subscribing to another plan.'
      : 'You already have a pending subscription.'
    : null

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      const businessType = user.businessType || user.business_type || 'hospital'
      setUserType(businessType)
      if (businessType === 'pharmacy') {
        router.push('/dashboard/pharmacy/templates')
        return
      }
    }
  }, [router])

  useEffect(() => {
    const hydrate = async () => {
      let backendFeatures: {
        reviewSystem?: boolean
        aiChatbot?: boolean
        patientPortal?: boolean
        prescriptionRefill?: boolean
      } | null = null
      let storedFeatures: Partial<FeatureState> | null = null
      let storedPlanHints: {
        plan?: string
        aiChatbot?: boolean
        patientPortal?: boolean
        prescriptionRefill?: boolean
      } | null = null

      try {
        const token = localStorage.getItem('access_token')
        if (token) {
          const response = await websiteSetupApiV2.get()
          const payload = response.data as any
          const setup = Array.isArray(payload?.results)
            ? payload.results[0]
            : Array.isArray(payload)
              ? payload[0]
              : payload
          if (setup) {
            backendFeatures = {
              reviewSystem: Boolean(setup.review_system),
              aiChatbot: Boolean(setup.ai_chatbot),
              patientPortal: Boolean(setup.patient_portal),
              prescriptionRefill: Boolean(setup.prescription_refill),
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load hospital feature setup from backend:', error)
      }

      try {
        const storedRaw = getScopedItem('selectedFeatures')
        if (storedRaw) {
          const parsed = JSON.parse(storedRaw) as Partial<FeatureState>
          storedFeatures = {
            plan: parsed.plan === 'standard' || parsed.plan === 'basic' ? parsed.plan : 'basic',
            customTheme: Boolean(parsed.customTheme),
            brandingSetup: Boolean(parsed.brandingSetup),
          }
          storedPlanHints = {
            plan: parsed.plan,
            aiChatbot: Boolean((parsed as any).aiChatbot),
            patientPortal: Boolean((parsed as any).patientPortal),
            prescriptionRefill: Boolean((parsed as any).prescriptionRefill),
          }
        }
      } catch (error) {
        console.warn('Failed to load stored hospital features:', error)
      }

      const plan = resolvePlanKey(
        backendFeatures
          ? {
              aiChatbot: backendFeatures.aiChatbot,
              patientPortal: backendFeatures.patientPortal,
              prescriptionRefill: backendFeatures.prescriptionRefill,
            }
          : storedPlanHints,
      )

      const resolvedState: FeatureState = {
        plan,
        customTheme: storedFeatures?.customTheme ?? false,
        brandingSetup: storedFeatures?.brandingSetup ?? false,
      }

      if (backendFeatures) {
        setScopedItem('selectedFeatures', JSON.stringify(buildStoredFeatures(resolvedState)))
      }

      setFormData((prev) => ({ ...prev, ...resolvedState }))
      setIsHydrated(true)
    }
    void hydrate()
  }, [])

  const planPricing = useMemo(() => PLANS.find((p) => p.key === formData.plan), [formData.plan])
  const monthlyTotal = planPricing?.monthlyPrice ?? 0
  const oneTimeTotal = useMemo(() => {
    let total = 0
    ADD_ONS.forEach((f) => { if (formData[f.key]) total += f.price })
    return total
  }, [formData])
  const totalPrice = monthlyTotal + oneTimeTotal

  useEffect(() => {
    if (!isHydrated) return
    setScopedItem('selectedFeatures', JSON.stringify(buildStoredFeatures(formData)))
    setScopedItem('totalPrice', totalPrice.toString())
    const persist = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) return
        await websiteSetupApiV2.update({
          review_system: true,
          ai_chatbot: formData.plan === 'standard',
          patient_portal: formData.plan === 'standard',
          prescription_refill: formData.plan === 'standard',
          total_price: totalPrice,
        })
      } catch (error) {
        console.warn('Failed to auto-save hospital features:', error)
      }
    }
    void persist()
  }, [formData, isHydrated, totalPrice])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (hasLockedSubscription) {
      setSubscriptionError(blockMessage ?? 'You already have an active subscription.')
      return
    }
    setPaymentOpen(true)
  }

  const handlePaymentSuccess = async () => {
    if (hasLockedSubscription) {
      setSubscriptionError(blockMessage ?? 'You already have an active subscription.')
      return
    }
    setScopedItem('selectedFeatures', JSON.stringify(buildStoredFeatures(formData)))
    setScopedItem('totalPrice', totalPrice.toString())

    // Build the list of purchased one-time feature keys
    const purchasedOneTimeFeatures = ADD_ONS
      .filter((addon) => formData[addon.key])
      .map((addon) => addon.planFeature)

    // Activate subscription on backend
    setActivating(true)
    const selectedPlan = PLANS.find((p) => p.key === formData.plan)
    if (selectedPlan) {
      const endsAt = new Date()
      endsAt.setMonth(endsAt.getMonth() + 1) // 1 month from now
      const result = await activateSubscription({
        plan_type: selectedPlan.backendKey,
        subscription_status: 'ACTIVE',
        subscription_ends_at: endsAt.toISOString(),
        // ✅ Pass purchased add-ons so backend stores them in one_time_features
        ...(purchasedOneTimeFeatures.length > 0 && { one_time_features: purchasedOneTimeFeatures }),
      })
      if (result.error) {
        setSubscriptionError(result.error)
        setActivating(false)
        return
      }
      await refresh() // re-fetch subscription state into context
    }
    setActivating(false)
    router.push('/dashboard/business-info?type=hospital')
  }

  const handleCancelSubscription = async () => {
    setSubscriptionError(null)
    setCancelling(true)
    const result = await updateSubscription({ subscription_status: 'CANCELLED' })
    if (result.error) {
      setSubscriptionError(result.error)
    } else {
      await refresh()
    }
    setCancelling(false)
  }

  const handleSaveDraft = () => {
    setScopedItem('selectedFeatures', JSON.stringify(buildStoredFeatures(formData)))
    setScopedItem('totalPrice', totalPrice.toString())
    alert('Draft saved successfully!')
  }

  if (userType === 'pharmacy') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-gray">Redirecting to templates...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-dark mb-2">Hospital Website Setup</h1>
          <p className="text-neutral-gray">
            Select the features you want on your hospital website. You can manage your doctors and
            departments from the{' '}
            <a href="/dashboard/hospital/doctors" className="text-primary underline">
              Doctors tab
            </a>
            .
          </p>
        </div>
        {/* Current active plan badge */}
        {!subLoading && isActive && (
          <div className={`shrink-0 flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold ${PLAN_BADGE_CLASSES[planType]}`}>
            <FiCheckCircle size={14} />
            {PLAN_LABELS[planType]} Plan Active
          </div>
        )}
        {!subLoading && !isActive && (
          <div className="shrink-0 flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
            <FiZap size={14} />
            No Active Plan
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Plans Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-neutral-dark">Plans</h2>
              <div className="flex items-center gap-2 bg-primary-light px-4 py-2 rounded-lg">
                <FiDollarSign className="text-primary" size={20} />
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">${monthlyTotal}/mo</p>
                  <p className="text-xs text-neutral-gray">${oneTimeTotal} one-time add-ons</p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {PLANS.map((plan) => {
                const isCurrentActive = isActive && activePlanKey === plan.key
                const isPlanLocked = hasLockedSubscription && !isCurrentActive
                return (
                  <button
                    key={plan.key}
                    type="button"
                    disabled={isPlanLocked}
                    onClick={() => {
                      if (isPlanLocked) return
                      setSubscriptionError(null)
                      setFormData((prev) => ({ ...prev, plan: plan.key }))
                    }}
                    className={`relative text-left p-4 border rounded-lg transition-shadow ${
                      formData.plan === plan.key
                        ? 'border-primary shadow-sm'
                        : 'border-neutral-border hover:shadow-sm'
                    } ${isPlanLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    {/* "Current plan" ribbon */}
                    {isCurrentActive && (
                      <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-green-100 border border-green-200 px-2 py-0.5 text-[10px] font-bold text-green-700">
                        <FiCheckCircle size={10} /> Current
                      </span>
                    )}
                    <div className="flex items-center justify-between pr-16">
                      <div>
                        <p className="text-lg font-semibold text-neutral-dark">{plan.label}</p>
                        <p className="text-sm text-neutral-gray">${plan.monthlyPrice}/month</p>
                      </div>
                      <div className={`h-3 w-3 rounded-full ${formData.plan === plan.key ? 'bg-primary' : 'bg-neutral-border'}`} />
                    </div>
                    <ul className="mt-4 space-y-1 text-sm text-neutral-gray">
                      {plan.features.map((f) => (
                        <li key={f}>• {f}</li>
                      ))}
                    </ul>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* One-time Features Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-neutral-dark">One-time Features</h2>
              <p className="text-sm text-neutral-gray">Add optional one-time upgrades.</p>
            </div>
            <div className="space-y-4">
              {ADD_ONS.map((feature) => (
                <div key={feature.key} className="flex items-center justify-between p-4 border border-neutral-border rounded-lg">
                  <div className="flex-1">
                    <Toggle
                      label={feature.label}
                      checked={formData[feature.key]}
                      onChange={(checked) => setFormData({ ...formData, [feature.key]: checked })}
                      description={feature.description}
                    />
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-lg font-semibold text-neutral-dark">${feature.price}</p>
                    <p className="text-xs text-neutral-gray">one-time</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Actions */}
          {blockMessage && !subscriptionError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {blockMessage}
            </div>
          )}
          {subscriptionError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {subscriptionError}
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-4">
            {(isActive || hasPendingSubscription) && (
              <Button
                variant="secondary"
                type="button"
                onClick={handleCancelSubscription}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Current Plan'}
              </Button>
            )}
            <Button variant="secondary" type="button" onClick={handleSaveDraft}>
              Save Draft
            </Button>
            <Button
              variant="primary"
              type="submit"
              formNoValidate
              disabled={activating || hasLockedSubscription}
            >
              <FiDollarSign className="mr-2" />
              {activating ? 'Activating...' : `Continue to Payment ($${totalPrice})`}
            </Button>
          </div>
        </div>
      </form>

      <PaymentModal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        amount={totalPrice}
        description="Payment for selected hospital website features"
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  )
}

// ── Page wrapper ─────────────────────────────────────────────────────────────

export default function HospitalSetupPage() {
  return (
    <SubscriptionProvider>
      <HospitalSetupContent />
    </SubscriptionProvider>
  )
}
