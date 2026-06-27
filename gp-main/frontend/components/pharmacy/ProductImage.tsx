'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { FiImage } from 'react-icons/fi'

import { normalizeRenderableProductImageUrl } from '@/lib/productImage'

type ProductImageProps = {
  src?: string | null
  alt: string
  className?: string
  fallbackClassName?: string
  fallbackLabel?: string
  loading?: 'lazy' | 'eager'
}

export function ProductImage({
  src,
  alt,
  className = 'h-full w-full object-cover',
  fallbackClassName = 'grid h-full w-full place-items-center bg-slate-100 text-slate-500',
  fallbackLabel = 'No product image',
  loading = 'lazy',
}: ProductImageProps) {
  const normalizedSrc = useMemo(() => normalizeRenderableProductImageUrl(src), [src])
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
  }, [normalizedSrc])

  if (!normalizedSrc || hasError) {
    return (
      <div className={fallbackClassName} role="img" aria-label={fallbackLabel}>
        <div className="flex flex-col items-center gap-2 px-2 text-center">
          <FiImage className="text-lg" />
          <span className="text-xs font-semibold uppercase tracking-[0.12em]">{fallbackLabel}</span>
        </div>
      </div>
    )
  }

  return (
    <img
      src={normalizedSrc}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setHasError(true)}
      referrerPolicy="no-referrer"
    />
  )
}
