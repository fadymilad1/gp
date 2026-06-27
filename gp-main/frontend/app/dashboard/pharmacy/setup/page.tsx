'use client'

import Link from 'next/link'
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiGlobe,
  FiLayers,
  FiPackage,
  FiShield,
} from 'react-icons/fi'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/ToastProvider'
import { businessInfoApi } from '@/lib/api'
import { pharmacyApi, pharmacyProductsApi } from '@/lib/pharmacy'

export default function PharmacySetupPage() {
  const router = useRouter()
  const { showToast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [templateId, setTemplateId] = useState<number | null>(null)
  const [productCount, setProductCount] = useState(0)
  const [hasBusinessInfo, setHasBusinessInfo] = useState(false)
  const [isPublished, setIsPublished] = useState(false)

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

    const load = async () => {
      setIsLoading(true)
      const [profileRes, statsRes, infoRes] = await Promise.all([
        pharmacyApi.getProfile(),
        pharmacyProductsApi.stats(),
        businessInfoApi.get(),
      ])

      const businessData = (infoRes.data || {}) as {
        name?: string
        address?: string
      }

      if (profileRes.error) {
        showToast({ type: 'error', title: 'Could not load setup profile', message: profileRes.error })
      }

      setTemplateId(profileRes.data?.template_id || null)
      setIsPublished(Boolean(profileRes.data?.is_published))
      setProductCount(statsRes.data?.total || 0)
      setHasBusinessInfo(Boolean(businessData.name && businessData.address))
      setIsLoading(false)
    }

    void load()
  }, [router, showToast])

  const steps = useMemo(
    () => [
      { label: 'Template selected', completed: Boolean(templateId) },
      { label: 'Business info completed', completed: hasBusinessInfo },
      { label: 'Products uploaded', completed: productCount > 0 },
      { label: 'Published', completed: isPublished },
    ],
    [templateId, hasBusinessInfo, productCount, isPublished],
  )

  const activeStep = steps.findIndex((step) => !step.completed)
  const completedCount = steps.filter((step) => step.completed).length
  const readinessPercent = Math.round((completedCount / steps.length) * 100)

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary-light via-white to-neutral-light p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-dark">Create Pharmacy Website</h1>
            <p className="text-neutral-gray mt-1">Follow this launch checklist to build and publish your pharmacy storefront.</p>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-white/80 px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-gray">Readiness</p>
            <p className="text-lg font-bold text-neutral-dark">{readinessPercent}%</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
          <p className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-white/80 px-3 py-2 text-neutral-dark"><FiShield className="text-primary" /> Safe publish workflow</p>
          <p className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-white/80 px-3 py-2 text-neutral-dark"><FiClock className="text-primary" /> Guided step sequence</p>
          <p className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-white/80 px-3 py-2 text-neutral-dark"><FiCheckCircle className="text-primary" /> Progress saved continuously</p>
        </div>
      </section>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-neutral-dark">Setup Progress</h2>
          <span className="rounded-full bg-primary-light px-3 py-1 text-sm font-medium text-primary">{completedCount}/{steps.length} complete</span>
        </div>
        <p className="mt-1 text-sm text-neutral-gray">Complete all milestones to unlock a polished live storefront.</p>
        <div className="mt-4">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <ProgressBar
              steps={steps}
              currentStep={activeStep === -1 ? steps.length - 1 : activeStep}
            />
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5 transition hover:-translate-y-0.5 hover:shadow-md">
          <FiLayers className="text-primary" />
          <div className="mt-3 text-lg font-semibold">Choose Template</div>
          <p className="mt-1 text-sm text-neutral-gray">Select one of the pharmacy website templates.</p>
          <Link href="/dashboard/pharmacy/templates" className="mt-4 inline-flex items-center text-sm text-primary">
            Open templates <FiArrowRight className="ml-1" />
          </Link>
        </Card>

        <Card className="p-5 transition hover:-translate-y-0.5 hover:shadow-md">
          <FiCheckCircle className="text-primary" />
          <div className="mt-3 text-lg font-semibold">Complete Business Info</div>
          <p className="mt-1 text-sm text-neutral-gray">Add pharmacy details used in your purchased template.</p>
          <Link href="/dashboard/business-info" className="mt-4 inline-flex items-center text-sm text-primary">
            Update info <FiArrowRight className="ml-1" />
          </Link>
        </Card>

        <Card className="p-5 transition hover:-translate-y-0.5 hover:shadow-md">
          <FiPackage className="text-primary" />
          <div className="mt-3 text-lg font-semibold">Upload Products</div>
          <p className="mt-1 text-sm text-neutral-gray">CSV upload + manual product management.</p>
          <Link href="/dashboard/pharmacy/products" className="mt-4 inline-flex items-center text-sm text-primary">
            Manage products <FiArrowRight className="ml-1" />
          </Link>
        </Card>

        <Card className="p-5 transition hover:-translate-y-0.5 hover:shadow-md">
          <FiGlobe className="text-primary" />
          <div className="mt-3 text-lg font-semibold">Template Preview & Publish</div>
          <p className="mt-1 text-sm text-neutral-gray">Preview from templates page, then publish from settings.</p>
          <Link href="/dashboard/pharmacy/templates" className="mt-4 inline-flex items-center text-sm text-primary">
            Open templates <FiArrowRight className="ml-1" />
          </Link>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-dark">Ready to continue?</h3>
            <p className="text-sm text-neutral-gray mt-1">
              {isPublished
                ? 'Your pharmacy website is already published. You can continue editing anytime.'
                : 'Complete missing steps and publish from Settings when everything looks good.'}
            </p>
          </div>
          <Link href="/dashboard/pharmacy">
            <Button>
              <FiCheckCircle className="mr-2" />
              Go to Pharmacy Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
