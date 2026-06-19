'use client'

import React from 'react'

interface ToggleProps {
  label?: string
  checked: boolean
  onChange: (checked: boolean) => void
  description?: string
}

export const Toggle: React.FC<ToggleProps> = ({
  label,
  checked,
  onChange,
  description,
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        {label && (
          <label className="block text-sm font-medium text-neutral-dark">
            {label}
          </label>
        )}
        {description && (
          <p className="text-sm text-neutral-gray mt-1">{description}</p>
        )}
      </div>
      <button
        type="button"
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-neutral-border'
        }`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

