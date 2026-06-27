'use client'

import React, { useState } from 'react'
import { FiEye, FiEyeOff } from 'react-icons/fi'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  showPasswordToggle?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  className = '',
  type,
  showPasswordToggle,
  ...props
}, ref) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const isPasswordField = Boolean(showPasswordToggle && type === 'password')
  const inputType = isPasswordField ? (isPasswordVisible ? 'text' : 'password') : type

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-neutral-dark mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          type={inputType}
          className={`input-field ${error ? 'border-error' : ''} ${isPasswordField ? 'pr-12' : ''} ${className}`}
          {...props}
        />
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setIsPasswordVisible((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-gray hover:text-primary transition-colors"
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            {isPasswordVisible ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-error">{error}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

