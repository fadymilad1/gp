import { API_BASE_URL, getAuthToken, type ApiResponse } from '@/lib/api'

export type PlanType = 'BASIC' | 'STANDARD' | 'AI' | 'PREMIUM'
export type SubscriptionStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING'

export interface SubscriptionState {
  plan_type: PlanType
  subscription_status: SubscriptionStatus
  subscription_ends_at: string | null
  is_active: boolean
  allowed_features: string[]
  can_publish: boolean
}

/** Human-readable labels for each plan */
export const PLAN_LABELS: Record<PlanType, string> = {
  BASIC: 'Basic',
  STANDARD: 'Premium',
  AI: 'AI',
  PREMIUM: 'Premium',
}

/** Badge colour classes for each plan */
export const PLAN_BADGE_CLASSES: Record<PlanType, string> = {
  BASIC: 'bg-slate-100 text-slate-700 border-slate-200',
  STANDARD: 'bg-blue-50 text-blue-700 border-blue-200',
  AI: 'bg-purple-50 text-purple-700 border-purple-200',
  PREMIUM: 'bg-amber-50 text-amber-700 border-amber-200',
}

/** All feature keys that can appear in allowed_features */
export const ALL_FEATURES = [
  'review_system',
  'ai_chatbot',
  'patient_portal',
  'prescription_refill',
  'custom_theme',
] as const

export type FeatureKey = (typeof ALL_FEATURES)[number]

/** Human-readable label for each feature key */
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  review_system: 'Review System',
  ai_chatbot: 'AI Chatbot',
  patient_portal: 'Patient Portal',
  prescription_refill: 'Prescription Refill',
  custom_theme: 'Custom Theme',
}

/**
 * GET /api/website-setups/subscription/
 * Returns the current hospital user's subscription state.
 */
export async function getSubscription(): Promise<ApiResponse<SubscriptionState>> {
  const token = getAuthToken()
  if (!token) return { error: 'Authentication required.' }

  try {
    const response = await fetch(`${API_BASE_URL}/website-setups/subscription/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      return {
        error: (data && typeof data === 'object' && 'detail' in data ? String(data.detail) : null)
          ?? `Request failed (${response.status})`,
        status: response.status,
        errorDetails: data,
      }
    }

    return { data: data as SubscriptionState, status: response.status }
  } catch {
    return { error: 'Network error while loading subscription.' }
  }
}

/**
 * PATCH /api/website-setups/{id}/
 * Activates a plan after payment (updates plan_type + subscription_status).
 */
export type SubscriptionPatchPayload = Partial<{
  plan_type: PlanType
  subscription_status: SubscriptionStatus
  subscription_ends_at: string | null
}>

async function patchSubscription(payload: SubscriptionPatchPayload): Promise<ApiResponse<unknown>> {
  const token = getAuthToken()
  if (!token) return { error: 'Authentication required.' }

  // Resolve the setup ID first
  try {
    const lookupResp = await fetch(`${API_BASE_URL}/website-setups/`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    const lookupData = await lookupResp.json().catch(() => null)
    const raw = Array.isArray(lookupData?.results)
      ? lookupData.results[0]
      : Array.isArray(lookupData)
        ? lookupData[0]
        : lookupData

    if (!raw?.id) return { error: 'Website setup not found.' }

    const patchResp = await fetch(`${API_BASE_URL}/website-setups/${raw.id}/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const patchData = await patchResp.json().catch(() => null)
    if (!patchResp.ok) {
      let message: string | null = null
      if (patchData && typeof patchData === 'object') {
        if ('detail' in patchData) {
          message = String((patchData as { detail?: unknown }).detail)
        } else if (Array.isArray((patchData as { non_field_errors?: unknown }).non_field_errors)) {
          const errors = (patchData as { non_field_errors: unknown[] }).non_field_errors
          if (errors.length) message = String(errors[0])
        } else {
          const firstKey = Object.keys(patchData).find((key) => Array.isArray((patchData as any)[key]))
          if (firstKey) {
            const errors = (patchData as any)[firstKey]
            if (errors?.length) message = String(errors[0])
          }
        }
      }
      return { error: message ?? 'Failed to update subscription.' }
    }
    return { data: patchData, status: patchResp.status }
  } catch {
    return { error: 'Network error while updating subscription.' }
  }
}

/**
 * PATCH /api/website-setups/{id}/
 * Activates a plan after payment (updates plan_type + subscription_status).
 */
export async function activateSubscription(payload: {
  plan_type: PlanType
  subscription_status: SubscriptionStatus
  subscription_ends_at?: string | null
  one_time_features?: string[]
}): Promise<ApiResponse<unknown>> {
  return patchSubscription(payload)
}

/**
 * PATCH /api/website-setups/{id}/
 * Update subscription status (cancel, pending, etc).
 */
export async function updateSubscription(payload: SubscriptionPatchPayload): Promise<ApiResponse<unknown>> {
  return patchSubscription(payload)
}
