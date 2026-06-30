'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { PaymentModal } from '@/components/payment/PaymentModal'
import { FiDollarSign, FiCheckCircle, FiZap, FiShield, FiClock } from 'react-icons/fi'
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
}

const DEFAULT_FORM_STATE: FeatureState = {
  plan: 'basic',
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
      'Patient Portal',
      'Basic contact forms',
      'Appointment system',
    ],
  },
  {
    key: 'standard' as const,
    backendKey: 'STANDARD' as PlanType,
    label: 'Premium Plan',
    setupPrice: 0,
    monthlyPrice: 29,
    features: [
      'Everything in Basic',
      'Medical Q&A chatbot',
      'Custom UI Theme',
      'Review system',
      'WhatsApp button integration',
    ],
  },
]

const ADD_ONS: any[] = []

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
  reviewSystem: state.plan === 'standard',
  patientPortal: true,
  aiChatbot: state.plan === 'standard',
  customTheme: state.plan === 'standard',
  prescriptionRefill: false,
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
  const totalPrice = planPricing?.monthlyPrice ?? 0

  useEffect(() => {
    if (!isHydrated) return
    setScopedItem('selectedFeatures', JSON.stringify(buildStoredFeatures(formData)))
    setScopedItem('totalPrice', totalPrice.toString())
    const persist = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) return
        await websiteSetupApiV2.update({
          review_system: formData.plan === 'standard',
          patient_portal: true,
          ai_chatbot: formData.plan === 'standard',
          prescription_refill: false,
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
      <section className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary-light via-white to-neutral-light p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-dark">Hospital Website Setup</h1>
            <p className="text-neutral-gray mt-1">
              Select the features you want on your hospital website. You can manage your doctors and departments from the{' '}
              <a href="/dashboard/hospital/doctors" className="text-primary font-semibold underline hover:text-primary-dark transition-colors">
                Doctors tab
              </a>
              .
            </p>
          </div>
          <div className="flex items-center gap-2">
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
        </div>
        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
          <p className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-white/80 px-3 py-2 text-neutral-dark">
            <FiShield className="text-primary" /> Safe publish workflow
          </p>
          <p className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-white/80 px-3 py-2 text-neutral-dark">
            <FiClock className="text-primary" /> Guided step sequence
          </p>
          <p className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-white/80 px-3 py-2 text-neutral-dark">
            <FiCheckCircle className="text-primary" /> Progress saved continuously
          </p>
        </div>
      </section>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Plans Section */}
          <div className="grid gap-6 md:grid-cols-2">
            {PLANS.map((plan) => {
              const isSelected = formData.plan === plan.key
              const isCurrentActive = isActive && activePlanKey === plan.key
              const isPlanLocked = hasLockedSubscription && !isCurrentActive
              const isPremium = plan.key === 'standard'

              return (
                <div
                  key={plan.key}
                  onClick={() => {
                    if (isPlanLocked) return
                    setSubscriptionError(null)
                    setFormData((prev) => ({ ...prev, plan: plan.key }))
                  }}
                  className={`relative flex flex-col justify-between p-8 rounded-3xl border bg-white cursor-pointer transition-all duration-300 ${
                    isSelected
                      ? 'border-primary ring-4 ring-primary/10 shadow-lg scale-[1.01]'
                      : 'border-neutral-border hover:border-primary/50 hover:shadow-md'
                  } ${isPlanLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isPremium && (
                    <div className="absolute -top-3.5 left-8 bg-gradient-to-r from-primary to-ai text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm tracking-wide uppercase">
                      Recommended
                    </div>
                  )}

                  {isCurrentActive && (
                    <span className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-success-light border border-success/20 px-3 py-1 text-xs font-bold text-success">
                      <FiCheckCircle size={12} /> Active Plan
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between mt-2">
                      <h3 className="text-2xl font-bold text-neutral-dark">{plan.label}</h3>
                      <input
                        type="radio"
                        name="plan"
                        checked={isSelected}
                        disabled={isPlanLocked}
                        readOnly
                        className="h-5 w-5 text-primary focus:ring-primary border-neutral-border cursor-pointer shrink-0"
                      />
                    </div>

                    <div className="mt-5 mb-6">
                      <span className="text-4xl font-extrabold text-neutral-dark">${plan.monthlyPrice}</span>
                      <span className="text-neutral-gray text-sm font-medium">/month</span>
                    </div>

                    <ul className="space-y-3 border-t border-neutral-border/50 pt-6">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-neutral-dark font-medium text-sm">
                          <FiCheckCircle className="text-success shrink-0 mt-0.5" size={16} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-4 border-t border-neutral-border/40">
                    <Button
                      type="button"
                      variant={isSelected ? 'primary' : 'secondary'}
                      className="w-full py-3 text-sm font-semibold"
                      disabled={isPlanLocked}
                    >
                      {isSelected ? 'Selected' : 'Choose Plan'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Messages */}
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

          {/* Actions & Summary */}
          <Card className="p-6 bg-neutral-light border border-neutral-border/60">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-gray">Selected Plan Billing</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold text-neutral-dark">{formData.plan === 'standard' ? 'Premium Plan' : 'Basic Plan'}</span>
                  <span className="text-lg font-bold text-primary">— ${totalPrice}/mo</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {(isActive || hasPendingSubscription) && (
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={handleCancelSubscription}
                    disabled={cancelling}
                    className="px-5 py-2.5 text-sm"
                  >
                    {cancelling ? 'Cancelling...' : 'Cancel Current Plan'}
                  </Button>
                )}
                <Button 
                  variant="secondary" 
                  type="button" 
                  onClick={handleSaveDraft}
                  className="px-5 py-2.5 text-sm"
                >
                  Save Draft
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  formNoValidate
                  disabled={activating || hasLockedSubscription}
                  className="px-6 py-2.5 text-sm"
                >
                  <FiDollarSign className="mr-1.5" />
                  {activating ? 'Activating...' : `Continue to Payment ($${totalPrice})`}
                </Button>
              </div>
            </div>
          </Card>
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
