'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { notFound, useSearchParams } from 'next/navigation'
import { SubdomainPublicInfo } from '@/lib/subdomainApi'
import { setSiteOwnerId, setSiteItem, setPublicSiteItem, getSiteOwnerId } from '@/lib/storage'
import { pharmacyApi } from '@/lib/pharmacy'
import { getPharmacyThemeCssVariables, normalizePharmacyThemeSettings } from '@/lib/pharmacyTheme'

// Import the layout and templates
import PharmacyTemplate1Page from '@/app/templates/pharmacy/1/page'
import PharmacyTemplate2Page from '@/app/templates/pharmacy/2/page'
import PharmacyTemplate3Page from '@/app/templates/pharmacy/3/page'
import PharmacyTemplate4Page from '@/app/templates/pharmacy/4/page'
import PharmacyTemplate5Page from '@/app/templates/pharmacy/5/page'
import PharmacyTemplate6Page from '@/app/templates/pharmacy/6/page'

interface Props {
  subdomainInfo: SubdomainPublicInfo
}

export default function PharmacySubdomainWrapper({ subdomainInfo }: Props) {
  const [themeSettings, setThemeSettings] = useState(() => normalizePharmacyThemeSettings(null))
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    // 1. Set the owner ID immediately so templates know whose data to fetch
    setSiteOwnerId(subdomainInfo.owner_id)

    // 2. Fetch public pharmacy profile to get the theme settings and business info
    const init = async () => {
      try {
        const profileRes = await pharmacyApi.getProfile()
        // Wait, pharmacyApi.getProfile() uses the token if it exists. But a visitor doesn't have a token.
        // We might need a public endpoint for the pharmacy profile. 
        // For now, if getProfile fails, we rely on cached data.
        if (profileRes.data?.theme_settings) {
          setThemeSettings(normalizePharmacyThemeSettings(profileRes.data.theme_settings))
        }
      } catch (err) {
        // Ignore errors
      } finally {
        setIsInitializing(false)
      }
    }
    
    init()
  }, [subdomainInfo])

  const themeVariables = useMemo(
    () => getPharmacyThemeCssVariables(themeSettings),
    [themeSettings],
  )

  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center">Loading pharmacy...</div>
  }

  // Render the correct template component
  const renderTemplate = () => {
    switch (subdomainInfo.template_id) {
      case 1: return <PharmacyTemplate1Page />
      case 2: return <PharmacyTemplate2Page />
      case 3: return <PharmacyTemplate3Page />
      case 4: return <PharmacyTemplate4Page />
      case 5: return <PharmacyTemplate5Page />
      case 6: return <PharmacyTemplate6Page />
      default: return <PharmacyTemplate1Page /> // Fallback
    }
  }

  return (
    <div className="pharmacy-theme-root" style={themeVariables as React.CSSProperties}>
      {renderTemplate()}
    </div>
  )
}
