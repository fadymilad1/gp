/**
 * User-scoped localStorage so each account only sees its own data.
 * Keys are prefixed with the current user id (e.g. user_<uuid>_businessInfo).
 */

export type StoredUser = {
  id: string
  email: string
  name: string
  business_type: string
  created_at?: string
}

const FALLBACK_API_BASE_URL = 'http://localhost:8000/api'

function getBackendOrigin(): string {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || FALLBACK_API_BASE_URL).trim()
  return apiBase.replace(/\/api\/?$/i, '')
}

export function normalizeLogoUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const logo = value.trim()
  if (!logo) return null

  if (
    logo.startsWith('data:') ||
    logo.startsWith('blob:') ||
    /^https?:\/\//i.test(logo)
  ) {
    return logo
  }

  const backendOrigin = getBackendOrigin()
  if (logo.startsWith('/media/')) {
    return `${backendOrigin}${logo}`
  }
  if (logo.startsWith('media/')) {
    return `${backendOrigin}/${logo}`
  }

  return logo
}

function normalizeBusinessInfoValue(value: string): string {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return value

    const currentLogo = normalizeLogoUrl(parsed.logo)
    const fallbackLogo = normalizeLogoUrl(parsed.logo_url)
    const resolvedLogo = currentLogo || fallbackLogo
    if (!resolvedLogo) return value

    const nextPayload: Record<string, unknown> = {
      ...parsed,
      logo: resolvedLogo,
    }

    if (typeof parsed.logo_url === 'string') {
      nextPayload.logo_url = fallbackLogo || parsed.logo_url
    }

    return JSON.stringify(nextPayload)
  } catch {
    return value
  }
}

function normalizeStorageValue(key: string, value: string): string {
  if (key === 'businessInfo') {
    return normalizeBusinessInfoValue(value)
  }
  return value
}

function getStoredUserRaw(): StoredUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const data = JSON.parse(raw) as StoredUser
    return data?.id ? data : null
  } catch {
    return null
  }
}

/** Current logged-in user from localStorage (used for scoping data). */
export function getStoredUser(): StoredUser | null {
  return getStoredUserRaw()
}

/** Prefix for user-specific keys. Empty if no user (e.g. public template pages). */
export function getStoragePrefix(): string {
  const user = getStoredUserRaw()
  if (!user?.id) return ''
  return getPrefixForUserId(String(user.id))
}

/** Prefix for a given user id (e.g. for saving orders when customer checks out and site owner is in session). */
export function getPrefixForUserId(userId: string): string {
  if (!userId) return ''
  return `user_${userId}_`
}

/** Get the localStorage key for the current user. Use for all user-specific data. */
export function prefixKey(key: string): string {
  const prefix = getStoragePrefix()
  return prefix ? `${prefix}${key}` : key
}

/** Get item from user-scoped storage. Returns null if no user. */
export function getScopedItem(key: string): string | null {
  if (typeof window === 'undefined') return null
  const scoped = prefixKey(key)
  if (scoped === key) return null // no user, don't read global key
  const value = localStorage.getItem(scoped)
  if (value === null) return null
  return normalizeStorageValue(key, value)
}

/** Set item in user-scoped storage. No-op if no user. */
export function setScopedItem(key: string, value: string): void {
  if (typeof window === 'undefined') return
  const scoped = prefixKey(key)
  if (scoped === key) return
  const normalizedValue = normalizeStorageValue(key, value)
  
  try {
    localStorage.setItem(scoped, normalizedValue)
  } catch (error) {
    // Handle quota exceeded error
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded. Clearing old data...')
      // Try to clear some space by removing old user data
      try {
        const keys = Object.keys(localStorage)
        keys.forEach(k => {
          if (k.startsWith('user_') && k !== scoped) {
            localStorage.removeItem(k)
          }
        })
        // Try again after cleanup
        localStorage.setItem(scoped, normalizedValue)
      } catch (retryError) {
        console.error('Failed to save to localStorage even after cleanup:', retryError)
      }
    } else {
      console.error('Failed to save to localStorage:', error)
    }
  }
}

/** Remove item from user-scoped storage. */
export function removeScopedItem(key: string): void {
  if (typeof window === 'undefined') return
  const scoped = prefixKey(key)
  if (scoped === key) return
  localStorage.removeItem(scoped)
}

const SITE_OWNER_KEY = 'pharmacySiteOwnerId'

/** Set the current site owner id (when owner visits their pharmacy template). Used so customer checkouts can save orders to the right account. */
export function setSiteOwnerId(userId: string | null): void {
  if (typeof window === 'undefined') return
  if (userId) sessionStorage.setItem(SITE_OWNER_KEY, userId)
  else sessionStorage.removeItem(SITE_OWNER_KEY)
}

/** Get the site owner id from session (e.g. for checkout when customer is not logged in). */
export function getSiteOwnerId(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(SITE_OWNER_KEY)
}

/** Get/set item for a specific user (e.g. when customer places order and we have site owner id). */
export function getItemForUser(userId: string, key: string): string | null {
  if (typeof window === 'undefined' || !userId) return null
  const value = localStorage.getItem(getPrefixForUserId(userId) + key)
  if (value === null) return null
  return normalizeStorageValue(key, value)
}

export function setItemForUser(userId: string, key: string, value: string): void {
  if (typeof window === 'undefined' || !userId) return
  localStorage.setItem(getPrefixForUserId(userId) + key, normalizeStorageValue(key, value))
}

/** Read key for "site" data: scoped when logged in, else global. Use on template pages so owner sees their data and visitors get fallback. */
export function getSiteItem(key: string): string | null {
  if (typeof window === 'undefined') return null
  const scoped = getScopedItem(key)
  if (scoped !== null) return scoped
  const publishedMirror = localStorage.getItem(`public_${key}`)
  if (publishedMirror !== null) return normalizeStorageValue(key, publishedMirror)
  const globalValue = localStorage.getItem(key)
  if (globalValue === null) return null
  return normalizeStorageValue(key, globalValue)
}

/** Write key for "site" data: scoped when logged in, else global. */
export function setSiteItem(key: string, value: string): void {
  if (typeof window === 'undefined') return
  const prefix = getStoragePrefix()
  if (prefix) setScopedItem(key, value)
  else localStorage.setItem(key, normalizeStorageValue(key, value))
}

/** Remove site item. */
export function removeSiteItem(key: string): void {
  if (typeof window === 'undefined') return
  const prefix = getStoragePrefix()
  if (prefix) removeScopedItem(key)
  else localStorage.removeItem(key)
}

/** Public mirror for published website data (used by visitor-facing template pages). */
export function setPublicSiteItem(key: string, value: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`public_${key}`, normalizeStorageValue(key, value))
}

export function removePublicSiteItem(key: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(`public_${key}`)
}
