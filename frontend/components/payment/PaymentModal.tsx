'use client'

import React, { useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FiCreditCard, FiCheck } from 'react-icons/fi'

export type PaymentSuccessPayload = {
  payment_method: 'visa' | 'fawry'
  transaction_reference: string
}

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  amount: number
  description: string
  onPaymentSuccess: (payload: PaymentSuccessPayload) => void
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  description,
  onPaymentSuccess,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'visa' | 'fawry' | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const [visaInfo, setVisaInfo] = useState({
    cardholderName: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
  })

  const [fawryInfo, setFawryInfo] = useState({
    fullName: '',
    phone: '',
    email: '',
  })

  const digitsOnly = (value: string) => value.replace(/\D+/g, '')

  const formatCardNumber = (value: string) => {
    const digits = digitsOnly(value).slice(0, 19)
    return digits.replace(/(.{4})/g, '$1 ').trim()
  }

  const formatExpiry = (value: string) => {
    const digits = digitsOnly(value).slice(0, 4)
    if (digits.length <= 2) return digits
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }

  const formatCvc = (value: string) => digitsOnly(value).slice(0, 4)

  const canPay = useMemo(() => {
    if (!selectedMethod) return false
    if (selectedMethod === 'visa') {
      const numberDigits = digitsOnly(visaInfo.cardNumber)
      const expiryMatch = /^(\d{2})\/(\d{2})$/.exec(visaInfo.expiry.trim())
      const month = expiryMatch ? Number(expiryMatch[1]) : 0
      const year2 = expiryMatch ? Number(expiryMatch[2]) : -1
      const expiryValid = Boolean(expiryMatch) && month >= 1 && month <= 12 && year2 >= 0
      const cvcDigits = digitsOnly(visaInfo.cvc)
      return (
        visaInfo.cardholderName.trim().length >= 2 &&
        numberDigits.length >= 13 &&
        numberDigits.length <= 19 &&
        expiryValid &&
        (cvcDigits.length === 3 || cvcDigits.length === 4)
      )
    }

    // fawry
    const phoneDigits = digitsOnly(fawryInfo.phone)
    const emailOk = /\S+@\S+\.\S+/.test(fawryInfo.email.trim())
    return fawryInfo.fullName.trim().length >= 2 && phoneDigits.length >= 10 && emailOk
  }, [selectedMethod, visaInfo, fawryInfo])

  const handlePayNow = async () => {
    if (!selectedMethod) return
    if (!canPay) return

    const transactionSeed =
      selectedMethod === 'visa'
        ? digitsOnly(visaInfo.cardNumber).slice(-4)
        : digitsOnly(fawryInfo.phone).slice(-4)
    const transactionReference = `${selectedMethod}-${Date.now()}-${transactionSeed || '0000'}`

    setIsProcessing(true)

    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false)
      onPaymentSuccess({
        payment_method: selectedMethod,
        transaction_reference: transactionReference,
      })
      onClose()
    }, 2000)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Payment" size="md">
      <div className="space-y-6">
        <div className="bg-neutral-light rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-neutral-gray">Total Amount</span>
            <span className="text-2xl font-bold text-neutral-dark">${amount.toFixed(2)}</span>
          </div>
          <p className="text-sm text-neutral-gray">{description}</p>
        </div>

        <div>
          <h3 className="font-semibold text-neutral-dark mb-4">Select Payment Method</h3>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setSelectedMethod('visa')}
              disabled={isProcessing}
              className={`w-full p-4 border-2 rounded-lg transition-colors flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedMethod === 'visa' ? 'border-primary bg-primary-light/40' : 'border-neutral-border hover:border-primary'
              }`}
              aria-label="Pay with Visa or Mastercard"
            >
              <div className="flex items-center gap-3">
                <FiCreditCard className="text-primary" size={24} />
                <div className="text-left">
                  <p className="font-semibold text-neutral-dark">Visa / Mastercard</p>
                  <p className="text-sm text-neutral-gray">Pay with credit or debit card</p>
                </div>
              </div>
              {selectedMethod === 'visa' && <FiCheck className="text-primary" />}
            </button>

            <button
              type="button"
              onClick={() => setSelectedMethod('fawry')}
              disabled={isProcessing}
              className={`w-full p-4 border-2 rounded-lg transition-colors flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedMethod === 'fawry' ? 'border-primary bg-primary-light/40' : 'border-neutral-border hover:border-primary'
              }`}
              aria-label="Pay with Fawry"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">F</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-neutral-dark">Fawry</p>
                  <p className="text-sm text-neutral-gray">Pay at Fawry outlets or online</p>
                </div>
              </div>
              {selectedMethod === 'fawry' && <FiCheck className="text-primary" />}
            </button>
          </div>
        </div>

        {selectedMethod === 'visa' && (
          <div className="rounded-lg border border-neutral-border bg-white p-4 space-y-4">
            <div>
              <div className="font-semibold text-neutral-dark">Card Information</div>
              <div className="text-xs text-neutral-gray">Demo only — this won’t charge a real card.</div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-2">
                  Cardholder Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={visaInfo.cardholderName}
                  onChange={(e) => setVisaInfo({ ...visaInfo, cardholderName: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Name on card"
                  autoComplete="cc-name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-2">
                  Card Number <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={visaInfo.cardNumber}
                  onChange={(e) => setVisaInfo({ ...visaInfo, cardNumber: formatCardNumber(e.target.value) })}
                  className="w-full px-4 py-2 border border-neutral-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="1234 5678 9012 3456"
                  autoComplete="cc-number"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-dark mb-2">
                    Expiry (MM/YY) <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={visaInfo.expiry}
                    onChange={(e) => setVisaInfo({ ...visaInfo, expiry: formatExpiry(e.target.value) })}
                    className="w-full px-4 py-2 border border-neutral-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="MM/YY"
                    autoComplete="cc-exp"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-dark mb-2">
                    CVC <span className="text-error">*</span>
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={visaInfo.cvc}
                    onChange={(e) => setVisaInfo({ ...visaInfo, cvc: formatCvc(e.target.value) })}
                    className="w-full px-4 py-2 border border-neutral-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="123"
                    autoComplete="cc-csc"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedMethod === 'fawry' && (
          <div className="rounded-lg border border-neutral-border bg-white p-4 space-y-4">
            <div>
              <div className="font-semibold text-neutral-dark">Fawry Information</div>
              <div className="text-xs text-neutral-gray">Demo only — we simulate the payment confirmation.</div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-2">
                  Full Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={fawryInfo.fullName}
                  onChange={(e) => setFawryInfo({ ...fawryInfo, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-2">
                  Phone Number <span className="text-error">*</span>
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={fawryInfo.phone}
                  onChange={(e) => setFawryInfo({ ...fawryInfo, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-2">
                  Email <span className="text-error">*</span>
                </label>
                <input
                  type="email"
                  value={fawryInfo.email}
                  onChange={(e) => setFawryInfo({ ...fawryInfo, email: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="primary"
            onClick={handlePayNow}
            className="flex-1"
            disabled={!selectedMethod || !canPay || isProcessing}
          >
            {isProcessing ? (
              <span className="inline-flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                Processing...
              </span>
            ) : (
              `Pay $${amount.toFixed(2)}`
            )}
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={isProcessing}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}

