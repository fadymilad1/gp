'use client'

import React from 'react'

type SkeletonProps = {
  className?: string
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return <div className={`animate-pulse rounded-md bg-neutral-border/60 ${className}`} aria-hidden="true" />
}
