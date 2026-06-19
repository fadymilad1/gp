'use client'

import Image from 'next/image'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiCheck, FiEye, FiLayers, FiLoader, FiMessageSquare, FiShield, FiXCircle } from 'react-icons/fi'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { PaymentModal, type PaymentSuccessPayload } from '@/components/payment/PaymentModal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/ToastProvider'
import { pharmacyApi, type PharmacyTemplatePurchase } from '@/lib/pharmacy'
import {
  PHARMACY_TEMPLATES,
  PHARMACY_TEMPLATE_CATEGORIES,
  getTemplateById,
  type PharmacyTemplateCategory,
} from '@/lib/pharmacyTemplates'
import {
  removePublicSiteItem,
  removeScopedItem,
  setPublicSiteItem,
  setScopedItem,
} from '@/lib/storage'

type CategoryFilter = 'all' | PharmacyTemplateCategory

const TEMPLATE_STORAGE_KEYS = ['selectedTemplate', 'totalPrice', 'templateSubscriptionStartedAt'] as const

function clearTemplatePersistence() {
  TEMPLATE_STORAGE_KEYS.forEach((key) => {
    removeScopedItem(key)
    removePublicSiteItem(key)
  })
}

function persistTemplateSelection(templateId: number, purchase: PharmacyTemplatePurchase) {
  const amountNumber = Number.parseFloat(purchase.amount)
  const normalizedAmount = Number.isFinite(amountNumber) ? amountNumber.toFixed(2) : purchase.amount
  const startedAt = purchase.purchased_at || new Date().toISOString()

  setScopedItem('selectedTemplate', String(templateId))
  setScopedItem('totalPrice', normalizedAmount)
  setScopedItem('templateSubscriptionStartedAt', startedAt)

  setPublicSiteItem('selectedTemplate', String(templateId))
  setPublicSiteItem('totalPrice', normalizedAmount)
  setPublicSiteItem('templateSubscriptionStartedAt', startedAt)
}

export default function PharmacyTemplatesPage() {
  const router = useRouter()
  const { showToast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [purchases, setPurchases] = useState<PharmacyTemplatePurchase[]>([])
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [previewTemplateId, setPreviewTemplateId] = useState<number | null>(null)
  const [paymentTemplateId, setPaymentTemplateId] = useState<number | null>(null)
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false)
  const [isCancellingTemplateId, setIsCancellingTemplateId] = useState<number | null>(null)

  const purchasesByTemplateId = useMemo(
    () => new Map(purchases.map((purchase) => [purchase.template_id, purchase])),
    [purchases],
  )

  const activePurchaseCount = useMemo(
    () => purchases.filter((purchase) => purchase.status === 'active').length,
    [purchases],
  )

  const selectedTemplate = useMemo(
    () => getTemplateById(selectedTemplateId),
    [selectedTemplateId],
  )

  const visibleTemplates = useMemo(() => {
    return category === 'all'
      ? PHARMACY_TEMPLATES
      : PHARMACY_TEMPLATES.filter((template) => template.category === category)
  }, [category])

  const previewTemplate = useMemo(() => getTemplateById(previewTemplateId), [previewTemplateId])

  const loadTemplateState = useCallback(async () => {
    setIsLoading(true)

    const [profileRes, purchasesRes] = await Promise.all([
      pharmacyApi.getProfile(),
      pharmacyApi.listTemplatePurchases(),
    ])

    if (profileRes.error) {
      showToast({ type: 'error', title: 'Could not load template status', message: profileRes.error })
    }

    if (purchasesRes.error) {
      showToast({ type: 'error', title: 'Could not load purchases', message: purchasesRes.error })
    }

    const nextSelectedTemplateId = profileRes.data?.template_id || null
    const nextPurchases = purchasesRes.data || []
    const activeSelectedPurchase = nextPurchases.find(
      (purchase) =>
        purchase.template_id === nextSelectedTemplateId && purchase.status === 'active',
    )

    setSelectedTemplateId(nextSelectedTemplateId)
    setPurchases(nextPurchases)

    if (nextSelectedTemplateId && activeSelectedPurchase) {
      persistTemplateSelection(nextSelectedTemplateId, activeSelectedPurchase)
    } else {
      clearTemplatePersistence()
    }

    setIsLoading(false)
  }, [showToast])

  useEffect(() => {
    const userRaw = localStorage.getItem('user')
    if (!userRaw) {
      router.push('/login')
      return
    }

    try {
      const user = JSON.parse(userRaw)
      if ((user.businessType || user.business_type) !== 'pharmacy') {
        router.push('/dashboard')
        return
      }
    } catch {
      router.push('/dashboard')
      return
    }

    void loadTemplateState()
  }, [loadTemplateState, router])

  const handleTemplateSelect = async (templateId: number) => {
    const template = getTemplateById(templateId)
    if (!template) return

    if (selectedTemplateId === templateId) {
      return
    }

    const purchase = purchasesByTemplateId.get(templateId)
    const hasActivePurchase = purchase?.status === 'active'

    if (hasActivePurchase) {
      setIsSubmittingPurchase(true)

      const saveRes = await pharmacyApi.saveProfile(
        {
          template_id: templateId,
        },
        'PATCH',
      )

      if (saveRes.error) {
        showToast({ type: 'error', title: 'Could not activate template', message: saveRes.error })
        setIsSubmittingPurchase(false)
        return
      }

      await loadTemplateState()
      setIsSubmittingPurchase(false)

      showToast({
        type: 'success',
        title: 'Template activated',
        message: `${template.name} is now active for your pharmacy website.`,
      })

      router.push('/dashboard/pharmacy/products')
      return
    }

    setPaymentTemplateId(templateId)
  }

  const handlePaymentSuccess = async (paymentPayload: PaymentSuccessPayload) => {
    if (!paymentTemplateId) return

    const template = getTemplateById(paymentTemplateId)
    if (!template) return

    setIsSubmittingPurchase(true)

    const purchaseRes = await pharmacyApi.purchaseTemplate({
      template_id: paymentTemplateId,
      payment_method: paymentPayload.payment_method,
      transaction_reference: paymentPayload.transaction_reference,
    })

    if (purchaseRes.error) {
      showToast({ type: 'error', title: 'Could not complete purchase', message: purchaseRes.error })
      setIsSubmittingPurchase(false)
      return
    }

    setPaymentTemplateId(null)
    await loadTemplateState()
    setIsSubmittingPurchase(false)

    showToast({
      type: 'success',
      title: 'Template purchased',
      message: `${template.name} is now active for your pharmacy website.`,
    })

    router.push('/dashboard/pharmacy/products')
  }

  const handleCancelTemplatePurchase = async (templateId: number) => {
    setIsCancellingTemplateId(templateId)

    const template = getTemplateById(templateId)
    const cancelRes = await pharmacyApi.cancelTemplatePurchase(templateId)

    if (cancelRes.error) {
      showToast({ type: 'error', title: 'Could not cancel purchase', message: cancelRes.error })
      setIsCancellingTemplateId(null)
      return
    }

    await loadTemplateState()
    setIsCancellingTemplateId(null)

    showToast({
      type: 'success',
      title: 'Purchase cancelled',
      message: `${template?.name || 'Template'} purchase was cancelled successfully.`,
    })
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary-light via-white to-neutral-light p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-dark">Template Selection</h1>
            <p className="text-neutral-gray mt-1">Choose a template, purchase once, activate anytime, and cancel if needed.</p>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-white/80 px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-gray">Active Template</p>
            <p className="text-sm font-bold text-neutral-dark">{selectedTemplate?.name || 'None selected'}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
          <p className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-white/80 px-3 py-2 text-neutral-dark"><FiShield className="text-primary" /> Purchase records persist in backend</p>
          <p className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-white/80 px-3 py-2 text-neutral-dark"><FiCheck className="text-primary" /> Activation is one-click for purchased templates</p>
        </div>
      </section>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-neutral-border p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-gray">Active Template</div>
            <div className="mt-1 text-sm font-semibold text-neutral-dark">{selectedTemplate?.name || 'None selected'}</div>
          </div>
          <div className="rounded-lg border border-neutral-border p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-gray">Rules</div>
            <div className="mt-1 text-sm text-neutral-dark">One persistent purchase per template. You can reactivate or cancel anytime.</div>
          </div>
        </div>
      </Card>

      {selectedTemplate ? (
        <Card className="border-primary/20 bg-primary-light/40 p-4">
          <p className="text-sm text-neutral-dark">
            <span className="font-semibold">{selectedTemplate.name}</span> is currently live for your pharmacy website. You can still preview or switch to another purchased template anytime.
          </p>
        </Card>
      ) : null}

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-dark">Filter Templates</h2>
          <p className="text-xs text-neutral-gray">{visibleTemplates.length} visible</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PHARMACY_TEMPLATE_CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(item.id)}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${
                category === item.id ? 'border-primary bg-primary-light text-primary' : 'border-neutral-border text-neutral-dark hover:border-primary/30'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleTemplates.map((template) => {
            const purchase = purchasesByTemplateId.get(template.id)
            const isSelected = selectedTemplateId === template.id
            const isPurchased = purchase?.status === 'active'
            const wasCancelled = purchase?.status === 'cancelled'
            const isCancelling = isCancellingTemplateId === template.id
            const isActionBusy = isSubmittingPurchase || isCancelling

            return (
              <Card key={template.id} className="overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="relative h-52 w-full">
                  <Image src={template.image} alt={`${template.name} preview`} fill className="object-cover" />
                  {template.hasAI ? (
                    <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-ai px-2 py-1 text-xs font-semibold text-white">
                      <FiMessageSquare /> AI
                    </div>
                  ) : null}
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-neutral-dark">{template.name}</h2>
                    <span className="text-xl font-bold text-primary">${template.price}</span>
                  </div>
                  <p className="mt-2 text-sm text-neutral-gray">{template.description}</p>

                  <div className="mt-2 text-xs font-medium">
                    {isSelected ? (
                      <span className="inline-flex rounded-full bg-success/10 px-2.5 py-1 text-success">Active on your website</span>
                    ) : isPurchased ? (
                      <span className="inline-flex rounded-full bg-primary-light px-2.5 py-1 text-primary">Purchased and ready to activate</span>
                    ) : wasCancelled ? (
                      <span className="inline-flex rounded-full bg-error/10 px-2.5 py-1 text-error">Purchase cancelled. You can repurchase anytime.</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-neutral-light px-2.5 py-1 text-neutral-gray">Not purchased yet</span>
                    )}
                  </div>

                  <ul className="mt-3 space-y-1 text-sm text-neutral-dark">
                    {template.highlights.map((item) => (
                      <li key={item} className="inline-flex items-center gap-2">
                        <FiCheck className="text-success" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex gap-2">
                    <Button variant="secondary" className="flex-1 px-3 py-2" onClick={() => setPreviewTemplateId(template.id)}>
                      <FiEye className="mr-2" /> Preview
                    </Button>
                    <Button
                      className="flex-1 px-3 py-2"
                      onClick={() => void handleTemplateSelect(template.id)}
                      disabled={isActionBusy || isSelected}
                    >
                      {isSubmittingPurchase && paymentTemplateId === template.id ? (
                        <span className="inline-flex items-center gap-2">
                          <FiLoader className="animate-spin" />
                          Processing...
                        </span>
                      ) : isSelected ? (
                        'Selected'
                      ) : isPurchased ? (
                        'Activate'
                      ) : wasCancelled ? (
                        'Repurchase'
                      ) : (
                        'Purchase'
                      )}
                    </Button>
                  </div>

                  {isPurchased ? (
                    <Button
                      variant="ghost"
                      className="mt-2 w-full px-3 py-2 text-error hover:bg-error/5"
                      onClick={() => void handleCancelTemplatePurchase(template.id)}
                      disabled={isActionBusy}
                    >
                      {isCancelling ? (
                        <span className="inline-flex items-center gap-2">
                          <FiLoader className="animate-spin" />
                          Cancelling...
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <FiXCircle />
                          Cancel Purchase
                        </span>
                      )}
                    </Button>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={Boolean(previewTemplate)}
        onClose={() => setPreviewTemplateId(null)}
        title={previewTemplate ? `${previewTemplate.name} live preview` : ''}
        size="xl"
      >
        {previewTemplate ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg border border-neutral-border">
              <iframe
                src={`/templates/pharmacy/${previewTemplate.id}?demo=1`}
                className="h-[560px] w-full"
                title={`${previewTemplate.name} live preview`}
                loading="lazy"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPreviewTemplateId(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setPreviewTemplateId(null)
                  void handleTemplateSelect(previewTemplate.id)
                }}
              >
                Use Template
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {paymentTemplateId ? (
        <PaymentModal
          isOpen={Boolean(paymentTemplateId)}
          onClose={() => setPaymentTemplateId(null)}
          amount={getTemplateById(paymentTemplateId)?.price || 0}
          description={`Payment for ${getTemplateById(paymentTemplateId)?.name || 'template'}`}
          onPaymentSuccess={handlePaymentSuccess}
        />
      ) : null}
    </div>
  )
}
