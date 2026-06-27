'use client'

import Link from 'next/link'
import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiAlertCircle, FiCheckCircle, FiLock } from 'react-icons/fi'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authApi } from '@/lib/api'

type ValidationState = 'loading' | 'valid' | 'invalid'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const uid = searchParams.get('uid') || ''
  const token = searchParams.get('token') || ''

  const [validationState, setValidationState] = useState<ValidationState>('loading')
  const [validationError, setValidationError] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    let isMounted = true

    const validateToken = async () => {
      if (!uid || !token) {
        if (!isMounted) return
        setValidationState('invalid')
        setValidationError('Reset link is missing required parameters.')
        return
      }

      const response = await authApi.validatePasswordResetToken(uid, token)
      if (!isMounted) return

      if (response.error || !response.data?.valid) {
        setValidationState('invalid')
        setValidationError(response.error || 'Reset link is invalid or has expired.')
        return
      }

      setValidationState('valid')
    }

    validateToken()

    return () => {
      isMounted = false
    }
  }, [uid, token])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError('')

    if (!password) {
      setFormError('Password is required.')
      return
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long.')
      return
    }

    if (password !== passwordConfirm) {
      setFormError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    const response = await authApi.resetPassword({
      uid,
      token,
      password,
      password_confirm: passwordConfirm,
    })

    if (response.error) {
      setFormError(response.error)
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    setIsSuccess(true)

    window.setTimeout(() => {
      router.push('/login')
    }, 1200)
  }

  return (
    <div className="min-h-screen bg-neutral-light flex items-center justify-center p-4 sm:p-6 overflow-x-hidden w-full">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-full">
        <div className="bg-primary-light rounded-lg p-12 items-center justify-center hidden md:flex">
          <div className="text-center">
            <div className="w-64 h-64 bg-primary rounded-full mx-auto mb-6 flex items-center justify-center">
              <FiLock className="text-white" size={80} />
            </div>
            <h2 className="text-2xl font-bold text-neutral-dark mb-4">Create a new password</h2>
            <p className="text-neutral-gray">Use a strong password you have not used before.</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 flex flex-col justify-center">
          <div className="mb-6 sm:mb-8">
            <Link href="/" className="text-xl sm:text-2xl font-bold text-primary mb-2 inline-block">
              Medify
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-dark mb-2">Reset Password</h1>
            <p className="text-sm sm:text-base text-neutral-gray">Set your new password to access your account.</p>
          </div>

          {validationState === 'loading' ? (
            <p className="text-sm text-neutral-gray">Validating your reset link...</p>
          ) : null}

          {validationState === 'invalid' ? (
            <div className="bg-error/10 border border-error rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="text-error mt-0.5" size={20} />
                <div>
                  <p className="text-sm text-error">{validationError}</p>
                  <Link href="/forgot-password" className="mt-3 inline-block text-sm text-primary hover:underline">
                    Request a new reset link
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          {validationState === 'valid' ? (
            isSuccess ? (
              <div className="rounded-lg border border-success/30 bg-success/10 p-4">
                <div className="flex items-start gap-3">
                  <FiCheckCircle className="mt-0.5 text-success" size={20} />
                  <div>
                    <p className="text-sm text-neutral-dark">Password reset successful. Redirecting to login...</p>
                    <Link href="/login" className="mt-3 inline-block text-sm text-primary hover:underline">
                      Continue to login
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {formError ? (
                  <div className="bg-error/10 border border-error rounded-lg p-4 flex items-center gap-3">
                    <FiAlertCircle className="text-error" size={20} />
                    <p className="text-error text-sm">{formError}</p>
                  </div>
                ) : null}

                <Input
                  type="password"
                  label="New password"
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (formError) setFormError('')
                  }}
                  required
                />

                <Input
                  type="password"
                  label="Confirm new password"
                  placeholder="Confirm your new password"
                  value={passwordConfirm}
                  onChange={(event) => {
                    setPasswordConfirm(event.target.value)
                    if (formError) setFormError('')
                  }}
                  required
                />

                <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
                </Button>
              </form>
            )
          ) : null}

          <div className="mt-6 text-center text-sm text-neutral-gray">
            Back to{' '}
            <Link href="/login" className="text-primary hover:underline">
              login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
