'use client'

import React, { useEffect, useMemo, useState } from 'react'

import { normalizeLogoUrl } from '@/lib/storage'

type BrandLogoProps = {
  src?: string | null
  alt: string
  fallbackText?: string
  imageClassName?: string
  fallbackClassName?: string
}

export function BrandLogo({
  src,
  alt,
  fallbackText = 'P',
  imageClassName = 'w-full h-full object-cover',
  fallbackClassName = 'w-full h-full bg-neutral-dark text-white flex items-center justify-center font-bold',
}: BrandLogoProps) {
  const normalizedSrc = useMemo(() => normalizeLogoUrl(src), [src])
  const [hasImageError, setHasImageError] = useState(false)

  useEffect(() => {
    setHasImageError(false)
  }, [normalizedSrc])

  const fallbackLetter = (fallbackText || 'P').charAt(0).toUpperCase() || 'P'

  if (!normalizedSrc || hasImageError) {
    return <div className={fallbackClassName}>{fallbackLetter}</div>
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={normalizedSrc}
      alt={alt}
      className={imageClassName}
      onError={() => setHasImageError(true)}
    />
  )
}
