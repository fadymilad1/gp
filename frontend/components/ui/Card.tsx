'use client'

import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
}) => {
  return (
    <div
      className={`card ${onClick ? 'cursor-pointer transition-shadow hover:shadow-[0_20px_45px_-28px_rgba(16,38,43,0.55)]' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

