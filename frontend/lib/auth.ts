import { authApi, getRefreshToken } from '@/lib/api'
import { getScopedItem, setScopedItem } from '@/lib/storage'

type AuthTokens = {
  access: string
  refresh: string
}

type AuthUser = {
  id: string
  email: string
  name: string
  business_type?: string
  businessType?: string
}

type PersistAuthSessionPayload = {
  user: AuthUser
  tokens: AuthTokens
  websiteSetupId?: string
}

const AUTH_STORAGE_KEYS = [
  'isLoggedIn',
  'user',
  'access_token',
  'refresh_token',
  'website_setup_id',
]

const SITE_OWNER_KEY = 'pharmacySiteOwnerId'

function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null

  const rawUser = localStorage.getItem('user')
  if (!rawUser) return null

  try {
    const parsed = JSON.parse(rawUser) as { id?: string }
    return parsed.id ? String(parsed.id) : null
  } catch {
    return null
  }
}

function clearUserScopedStorage(userId: string | null): void {
  if (typeof window === 'undefined' || !userId) return
  const scopedPrefix = `user_${userId}_`

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index)
    if (!key) continue
    if (key.startsWith(scopedPrefix)) {
      localStorage.removeItem(key)
    }
  }
}

function seedBusinessInfoName(userName?: string | null): void {
  if (typeof window === 'undefined') return
  const resolvedName = (userName || '').trim()
  if (!resolvedName) return

  const existing = getScopedItem('businessInfo')
  if (existing) {
    try {
      const parsed = JSON.parse(existing) as Record<string, unknown>
      const currentName = typeof parsed.name === 'string' ? parsed.name.trim() : ''
      if (currentName) return
      const nextPayload = { ...parsed, name: resolvedName }
      setScopedItem('businessInfo', JSON.stringify(nextPayload))
      window.dispatchEvent(new CustomEvent('business-info-updated'))
      return
    } catch {
      // Fall through to reset below.
    }
  }

  setScopedItem('businessInfo', JSON.stringify({ name: resolvedName }))
  window.dispatchEvent(new CustomEvent('business-info-updated'))
}

export function persistAuthSession(payload: PersistAuthSessionPayload): void {
  if (typeof window === 'undefined') return

  localStorage.setItem('user', JSON.stringify(payload.user))
  localStorage.setItem('access_token', payload.tokens.access)
  localStorage.setItem('refresh_token', payload.tokens.refresh)
  localStorage.setItem('isLoggedIn', 'true')

  if (payload.websiteSetupId) {
    localStorage.setItem('website_setup_id', payload.websiteSetupId)
  }

  seedBusinessInfoName(payload.user?.name)
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return

  const userId = getCurrentUserId()
  clearUserScopedStorage(userId)

  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key))
  sessionStorage.removeItem(SITE_OWNER_KEY)
}

export async function logoutUser(allDevices = false): Promise<string | null> {
  const refreshToken = getRefreshToken()
  let apiError: string | null = null

  if (refreshToken || allDevices) {
    const response = await authApi.logout({
      ...(refreshToken ? { refresh: refreshToken } : {}),
      ...(allDevices ? { all_devices: true } : {}),
    })

    if (response.error) {
      apiError = response.error
    }
  }

  clearAuthSession()
  return apiError
}
