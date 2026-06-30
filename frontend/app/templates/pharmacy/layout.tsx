'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { WhatsAppButton } from '@/components/pharmacy/WhatsAppButton'

import { pharmacyApi, pharmacyProductsApi } from '@/lib/pharmacy'
import { startPharmacyProductPolling, fetchSyncedProducts, persistProductSnapshot } from '@/lib/pharmacySheetSync'
import {
  getPharmacyThemeCssVariables,
  getStoredPharmacyThemeSettings,
  normalizePharmacyThemeSettings,
  persistPharmacyThemeSettings,
} from '@/lib/pharmacyTheme'
import { getSiteItem, getSiteOwnerId, getStoredUser, setPublicSiteItem, setSiteItem, setSiteOwnerId } from '@/lib/storage'

type BusinessInfoSnapshot = {
  name?: string
  logo?: string
  about?: string
  address?: string
  contactPhone?: string
  workingHours?: Record<string, unknown>
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export default function PharmacyTemplatesLayout({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={<div className="pharmacy-theme-root">{children}</div>}>
      <PharmacyTemplatesLayoutContent>{children}</PharmacyTemplatesLayoutContent>
    </React.Suspense>
  )
}

function PharmacyTemplatesLayoutContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const ownerId = searchParams?.get('owner') || ''
  const isDemo = searchParams?.get('demo') === '1' || searchParams?.get('demo') === 'true'
  const [resolvedOwnerId, setResolvedOwnerId] = useState('')
  // Keep first render deterministic across server/client to avoid hydration mismatches.
  const [themeSettings, setThemeSettings] = useState(() => normalizePharmacyThemeSettings(null))
  const pathname = usePathname()
  const [whatsAppPhone, setWhatsAppPhone] = useState('')

  const templateId = useMemo(() => {
    const match = pathname?.match(/\/templates\/pharmacy\/(\d+)/)
    return match ? parseInt(match[1], 10) : null
  }, [pathname])

  const showWhatsApp = templateId === 1 || templateId === 2 || templateId === 4

  useEffect(() => {
    const updatePhone = () => {
      if (isDemo) {
        if (pathname?.includes('/1')) {
          setWhatsAppPhone('+1 (555) 123-4567')
        } else if (pathname?.includes('/2')) {
          setWhatsAppPhone('+1 (555) 234-5678')
        } else if (pathname?.includes('/4')) {
          setWhatsAppPhone('+1 (555) 345-6789')
        }
        return
      }
      const businessInfo = safeJsonParse<{ contactPhone?: string; contact_phone?: string; phone?: string }>(getSiteItem('businessInfo'))
      const setup = safeJsonParse<{ phone?: string }>(getSiteItem('pharmacySetup'))
      const phone = businessInfo?.contactPhone || businessInfo?.contact_phone || businessInfo?.phone || setup?.phone || ''
      setWhatsAppPhone(phone)
    }

    updatePhone()
    window.addEventListener('storage', updatePhone)
    const interval = setInterval(updatePhone, 1000)

    return () => {
      window.removeEventListener('storage', updatePhone)
      clearInterval(interval)
    }
  }, [isDemo, pathname])

  useEffect(() => {
    const syncThemeFromStorage = () => {
      setThemeSettings(getStoredPharmacyThemeSettings())
    }

    syncThemeFromStorage()
    window.addEventListener('storage', syncThemeFromStorage)

    if (ownerId) {
      setSiteOwnerId(ownerId)
      setResolvedOwnerId(ownerId)
    }

    const currentUser = getStoredUser()
    if (!ownerId && currentUser?.id) {
      setSiteOwnerId(currentUser.id)
      setResolvedOwnerId(currentUser.id)
    }

    const localToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    let currentOwnerId = ownerId || getSiteOwnerId()
    let subdomain = ''
    if (!currentOwnerId && typeof window !== 'undefined') {
      const hostname = window.location.hostname
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        const parts = hostname.split('.')
        if (parts.length > 1) {
          subdomain = parts[0]
        }
      }
    }

    if (!isDemo || localToken || currentOwnerId || subdomain) {
      const cachedInfo = safeJsonParse<BusinessInfoSnapshot>(getSiteItem('businessInfo'))
      const token = localStorage.getItem('access_token')
      const apiBase = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8000/api` : 'http://localhost:8000/api')

      if (token) {
        void fetch(`${apiBase}/business-info/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
          .then((response) => (response.ok ? response.json() : null))
          .then((data) => {
            if (!data) return

            const merged: BusinessInfoSnapshot = {
              ...(cachedInfo || {}),
              name: data.name || cachedInfo?.name || '',
              about: data.about || cachedInfo?.about || '',
              address: data.address || cachedInfo?.address || '',
              contactPhone: data.contact_phone || cachedInfo?.contactPhone || '',
              workingHours: data.working_hours || cachedInfo?.workingHours || {},
              logo: data.logo_url || cachedInfo?.logo,
            }

            const serialized = JSON.stringify(merged)
            setSiteItem('businessInfo', serialized)
            setPublicSiteItem('businessInfo', serialized)
          })
          .catch(() => {
            // Ignore network errors; pages already support local fallbacks.
          })
      } else if (currentOwnerId) {
        void fetch(`${apiBase}/business-info/public_info/?owner_id=${currentOwnerId}`)
          .then((response) => (response.ok ? response.json() : null))
          .then((data) => {
            if (!data) return
            if (data.owner_id) {
              setSiteOwnerId(data.owner_id)
              setResolvedOwnerId(data.owner_id)
            }

            const bi = data.business_info || {}
            const merged: BusinessInfoSnapshot = {
              ...(cachedInfo || {}),
              name: bi.name || cachedInfo?.name || '',
              about: bi.about || cachedInfo?.about || '',
              address: bi.address || cachedInfo?.address || '',
              contactPhone: bi.contact_phone || cachedInfo?.contactPhone || '',
              workingHours: bi.working_hours || cachedInfo?.workingHours || {},
              logo: bi.logo_url || bi.logo || cachedInfo?.logo,
            }

            const serialized = JSON.stringify(merged)
            setSiteItem('businessInfo', serialized)
            setPublicSiteItem('businessInfo', serialized)
          })
          .catch(() => {})
      } else if (subdomain) {
        void fetch(`${apiBase}/business-info/public_info/?subdomain=${subdomain}`)
          .then((response) => (response.ok ? response.json() : null))
          .then((data) => {
            if (!data) return
            if (data.owner_id) {
              setSiteOwnerId(data.owner_id)
              setResolvedOwnerId(data.owner_id)
            }

            const bi = data.business_info || {}
            const merged: BusinessInfoSnapshot = {
              ...(cachedInfo || {}),
              name: bi.name || cachedInfo?.name || '',
              about: bi.about || cachedInfo?.about || '',
              address: bi.address || cachedInfo?.address || '',
              contactPhone: bi.contact_phone || cachedInfo?.contactPhone || '',
              workingHours: bi.working_hours || cachedInfo?.workingHours || {},
              logo: bi.logo_url || bi.logo || cachedInfo?.logo,
            }

            const serialized = JSON.stringify(merged)
            setSiteItem('businessInfo', serialized)
            setPublicSiteItem('businessInfo', serialized)
          })
          .catch(() => {})
      }

      void pharmacyApi
        .getProfile()
        .then((profileRes) => {
          if (!profileRes.data?.theme_settings) return
          const normalized = normalizePharmacyThemeSettings(profileRes.data.theme_settings)
          persistPharmacyThemeSettings(normalized)
          setThemeSettings(normalized)
        })
        .catch(() => {
          // Ignore profile hydration errors and use cached values.
        })
    }

    return () => {
      window.removeEventListener('storage', syncThemeFromStorage)
    }
  }, [isDemo, ownerId])

  useEffect(() => {
    const localToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    const finalOwnerId = ownerId || resolvedOwnerId || getSiteOwnerId()
    if (isDemo && !localToken && !finalOwnerId) return

    let stopPolling: (() => void) | undefined
    let active = true

    const startLivePolling = async () => {
      const currentUser = getStoredUser()
      const targetOwnerId = finalOwnerId || currentUser?.id
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null

      // Always fetch products at least once to ensure non-syncing users still get their products loaded.
      const response = await fetchSyncedProducts({
        authenticated: Boolean(token),
        ownerId: token ? null : targetOwnerId,
      })
      
      if (active && !response.error && response.data) {
        persistProductSnapshot(Array.isArray(response.data) ? response.data : [])
      }

      let syncEnabled = false
      if (token) {
        const status = await pharmacyProductsApi.getSheetSyncStatus()
        syncEnabled = Boolean(status.data?.google_sheet_sync_enabled)
      } else if (targetOwnerId) {
        const publicProducts = await pharmacyProductsApi.listPublic(targetOwnerId, false)
        syncEnabled = Boolean(publicProducts.data?.google_sheet_sync_enabled)
      }

      if (!active || !syncEnabled) return

      stopPolling = startPharmacyProductPolling({
        enabled: true,
        authenticated: Boolean(token),
        ownerId: token ? null : targetOwnerId,
        onProducts: () => undefined,
      })
    }

    void startLivePolling()

    return () => {
      active = false
      stopPolling?.()
    }
  }, [isDemo, ownerId, resolvedOwnerId])

  const themeVariables = useMemo(
    () => getPharmacyThemeCssVariables(themeSettings),
    [themeSettings],
  )

  return (
    <div className="pharmacy-theme-root" style={themeVariables as React.CSSProperties}>
      {children}
      {showWhatsApp && whatsAppPhone && (
        <WhatsAppButton phone={whatsAppPhone} />
      )}
    </div>
  )
}
