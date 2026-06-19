const HTTP_PROTOCOLS = new Set(['http:', 'https:'])

const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value)
    return HTTP_PROTOCOLS.has(parsed.protocol) && Boolean(parsed.hostname)
  } catch {
    return false
  }
}

export const normalizeCsvImageUrl = (value: string | null | undefined): string => {
  const trimmed = (value || '').trim()
  if (!trimmed) return ''

  return isHttpUrl(trimmed) ? trimmed : ''
}

export const normalizeRenderableProductImageUrl = (value: string | null | undefined): string => {
  const trimmed = (value || '').trim()
  if (!trimmed) return ''

  if (trimmed.startsWith('/')) return trimmed
  if (/^data:image\//i.test(trimmed)) return trimmed
  if (/^blob:/i.test(trimmed)) return trimmed
  if (isHttpUrl(trimmed)) return trimmed

  return ''
}
