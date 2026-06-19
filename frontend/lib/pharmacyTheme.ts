import type { PharmacyThemeSettings } from '@/lib/pharmacy'
import { getSiteItem, setPublicSiteItem, setScopedItem } from '@/lib/storage'

export type PharmacySectionKey =
  | 'hero'
  | 'featuredProducts'
  | 'categories'
  | 'offers'
  | 'contactInfo'
  | 'map'

export type ResolvedPharmacyThemeSettings = {
  primaryColor: string
  secondaryColor: string
  primaryLightColor: string
  fontFamily: string
  sections: Record<PharmacySectionKey, boolean>
}

const DEFAULT_PRIMARY = '#1B76FF'
const DEFAULT_SECONDARY = '#0C4EB7'
const DEFAULT_LIGHT = '#E7F2FF'
const DEFAULT_FONT = 'Inter'

const DEFAULT_SECTIONS: Record<PharmacySectionKey, boolean> = {
  hero: true,
  featuredProducts: true,
  categories: true,
  offers: true,
  contactInfo: true,
  map: true,
}

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!HEX_COLOR_RE.test(trimmed)) return fallback

  if (trimmed.length === 4) {
    const r = trimmed[1]
    const g = trimmed[2]
    const b = trimmed[3]
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }

  return trimmed.toUpperCase()
}

function lightenHexColor(hex: string, ratio = 0.88): string {
  const normalized = normalizeHexColor(hex, DEFAULT_PRIMARY)
  const clean = normalized.replace('#', '')

  const r = Number.parseInt(clean.slice(0, 2), 16)
  const g = Number.parseInt(clean.slice(2, 4), 16)
  const b = Number.parseInt(clean.slice(4, 6), 16)

  const nextR = Math.round(r + (255 - r) * ratio)
  const nextG = Math.round(g + (255 - g) * ratio)
  const nextB = Math.round(b + (255 - b) * ratio)

  const toHex = (channel: number) => channel.toString(16).padStart(2, '0').toUpperCase()
  return `#${toHex(nextR)}${toHex(nextG)}${toHex(nextB)}`
}

function normalizeFontFamily(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_FONT
  const trimmed = value.trim()
  if (!trimmed) return DEFAULT_FONT

  const supportedFonts = new Set(['Inter', 'Poppins', 'Merriweather', 'Nunito'])
  return supportedFonts.has(trimmed) ? trimmed : DEFAULT_FONT
}

function normalizeSections(raw: unknown): Record<PharmacySectionKey, boolean> {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}

  return {
    hero: input.hero !== false,
    featuredProducts: input.featuredProducts !== false,
    categories: input.categories !== false,
    offers: input.offers !== false,
    contactInfo: input.contactInfo !== false,
    map: input.map !== false,
  }
}

export function normalizePharmacyThemeSettings(
  input: Partial<PharmacyThemeSettings> | ResolvedPharmacyThemeSettings | null | undefined,
): ResolvedPharmacyThemeSettings {
  const data = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}

  const primaryColor = normalizeHexColor(data.primaryColor, DEFAULT_PRIMARY)
  const secondaryColor = normalizeHexColor(data.secondaryColor, DEFAULT_SECONDARY)
  const primaryLightColor = normalizeHexColor(data.primaryLightColor, lightenHexColor(primaryColor))

  return {
    primaryColor,
    secondaryColor,
    primaryLightColor,
    fontFamily: normalizeFontFamily(data.fontFamily),
    sections: normalizeSections(data.sections),
  }
}

export function getStoredPharmacyThemeSettings(): ResolvedPharmacyThemeSettings {
  const directSettings = safeJsonParse<ResolvedPharmacyThemeSettings>(getSiteItem('pharmacyThemeSettings'))
  if (directSettings) {
    return normalizePharmacyThemeSettings(directSettings)
  }

  const businessInfo = safeJsonParse<Record<string, unknown>>(getSiteItem('businessInfo'))
  const fallbackTheme = (businessInfo?.themeSettings || businessInfo?.theme_settings || null) as
    | Partial<PharmacyThemeSettings>
    | null

  return normalizePharmacyThemeSettings(fallbackTheme)
}

export function persistPharmacyThemeSettings(
  settings: Partial<PharmacyThemeSettings> | ResolvedPharmacyThemeSettings,
): ResolvedPharmacyThemeSettings {
  const normalized = normalizePharmacyThemeSettings(settings)
  const serialized = JSON.stringify(normalized)

  setScopedItem('pharmacyThemeSettings', serialized)
  setPublicSiteItem('pharmacyThemeSettings', serialized)

  return normalized
}

export function getPharmacyFontStack(fontFamily: string): string {
  switch (fontFamily) {
    case 'Poppins':
      return "'Poppins', 'Inter', system-ui, sans-serif"
    case 'Merriweather':
      return "'Merriweather', 'Inter', serif"
    case 'Nunito':
      return "'Nunito', 'Inter', system-ui, sans-serif"
    case 'Inter':
    default:
      return "'Inter', 'Poppins', system-ui, sans-serif"
  }
}

export function getPharmacyThemeCssVariables(
  settings: ResolvedPharmacyThemeSettings,
): Record<string, string> {
  return {
    '--pharmacy-primary': settings.primaryColor,
    '--pharmacy-secondary': settings.secondaryColor,
    '--pharmacy-primary-light': settings.primaryLightColor,
    '--pharmacy-font-stack': getPharmacyFontStack(settings.fontFamily),
  }
}

export function isSectionEnabled(
  settings: ResolvedPharmacyThemeSettings,
  key: PharmacySectionKey,
): boolean {
  return settings.sections[key] !== false
}
