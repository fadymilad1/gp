'use client'

import Link from 'next/link'
import React, { useState } from 'react'
import { FiAlertCircle, FiCheckCircle, FiMail } from 'react-icons/fi'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authApi } from '@/lib/api'

const GENERIC_SUCCESS_MESSAGE = 'If an account exists for this email, a password reset link has been sent.'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    const normalizedEmail = email.trim()

    if (!normalizedEmail) {
      setError('Email is required.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    setIsSubmitting(true)
    const response = await authApi.forgotPassword(normalizedEmail)

    if (response.error) {
      setError(response.error)
      setIsSubmitting(false)
      return
    }

    setSuccessMessage(response.data?.message || GENERIC_SUCCESS_MESSAGE)
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-neutral-light flex items-center justify-center p-4 sm:p-6 overflow-x-hidden w-full">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-full">
        <div className="bg-primary-light rounded-lg p-12 items-center justify-center hidden md:flex">
          <div className="text-center">
            <div className="w-64 h-64 bg-primary rounded-full mx-auto mb-6 flex items-center justify-center">
              <FiMail className="text-white" size={80} />
            </div>
            <h2 className="text-2xl font-bold text-neutral-dark mb-4">Reset your password</h2>
            <p className="text-neutral-gray">We will send a secure reset link to your account email.</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 flex flex-col justify-center">
          <div className="mb-6 sm:mb-8">
            <Link href="/" className="text-xl sm:text-2xl font-bold text-primary mb-2 inline-block">
              Medify
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-dark mb-2">Forgot Password</h1>
            <p className="text-sm sm:text-base text-neutral-gray">
              Enter your account email to receive a password reset link.
            </p>
          </div>

          {successMessage ? (
            <div className="rounded-lg border border-success/30 bg-success/10 p-4">
              <div className="flex items-start gap-3">
                <FiCheckCircle className="mt-0.5 text-success" size={20} />
                <p className="text-sm text-neutral-dark">{successMessage}</p>
              </div>
              <div className="mt-4">
                <Link href="/login" className="text-sm text-primary hover:underline">
                  Return to login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error ? (
                <div className="bg-error/10 border border-error rounded-lg p-4 flex items-center gap-3">
                  <FiAlertCircle className="text-error" size={20} />
                  <p className="text-error text-sm">{error}</p>
                </div>
              ) : null}

              <Input
                type="email"
                label="Email Address"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  if (error) setError('')
                }}
                required
              />

              <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Sending Reset Link...' : 'Send Reset Link'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-neutral-gray">
            Remembered your password?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
