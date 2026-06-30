'use client'

import Link from 'next/link'
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiArrowRight,
  FiBox,
  FiCheckCircle,
  FiEdit3,
  FiExternalLink,
  FiGlobe,
  FiInfo,
  FiLayout,
  FiMonitor,
  FiPackage,
  FiPlusCircle,
  FiUploadCloud,
} from 'react-icons/fi'

import { BrandLogo } from '@/components/pharmacy/BrandLogo'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/ToastProvider'
import { businessInfoApi } from '@/lib/api'
import { pharmacyApi, pharmacyProductsApi, type PharmacyProfile, type ProductStats } from '@/lib/pharmacy'
import { getTemplateById } from '@/lib/pharmacyTemplates'

type BusinessInfoLite = {
  name?: string
  logo_url?: string
  address?: string
  about?: string
  is_published?: boolean
}

const initialStats: ProductStats = {
  total: 0,
  out_of_stock: 0,
  low_stock: 0,
  categories: 0,
  last_updated: null,
}

// ── Circular progress ring ────────────────────────────────────────────────────
function CircleProgress({ percent }: { percent: number }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ
  return (
    <svg width="96" height="96" className="rotate-[-90deg]">
      <circle cx="48" cy="48" r={r} fill="none" stroke="#DCE3EC" strokeWidth="8" />
      <circle
        cx="48" cy="48" r={r} fill="none"
        stroke="#1B76FF" strokeWidth="8"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  )
}

export default function PharmacyDashboardPage() {
  const router = useRouter()
  const { showToast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [isPublishing, setIsPublishing] = useState(false)
  const [profile, setProfile] = useState<PharmacyProfile | null>(null)
  const [productStats, setProductStats] = useState<ProductStats>(initialStats)
  const [businessInfo, setBusinessInfo] = useState<BusinessInfoLite | null>(null)
  const [ownerId, setOwnerId] = useState('')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const userRaw = localStorage.getItem('user')
    if (!userRaw) { router.push('/login'); return }

    try {
      const user = JSON.parse(userRaw)
      const businessType = user.businessType || user.business_type
      if (businessType !== 'pharmacy') { router.push('/dashboard'); return }
      if (user.id) setOwnerId(String(user.id))
      if (user.name || user.username) setUserName(user.name || user.username)
    } catch {
      router.push('/dashboard'); return
    }

    const load = async () => {
      setIsLoading(true)
      const [profileRes, statsRes, infoRes] = await Promise.all([
        pharmacyApi.getProfile(),
        pharmacyProductsApi.stats(),
        businessInfoApi.get(),
      ])
      if (profileRes.error) showToast({ type: 'error', title: 'Could not load pharmacy profile', message: profileRes.error })
      if (statsRes.error) showToast({ type: 'error', title: 'Could not load product stats', message: statsRes.error })
      if (infoRes.error) showToast({ type: 'error', title: 'Business info unavailable', message: infoRes.error })

      setProfile(profileRes.data || null)
      setProductStats(statsRes.data || initialStats)
      setBusinessInfo((infoRes.data as BusinessInfoLite) || null)
      setIsLoading(false)
    }
    void load()
  }, [router, showToast])

  const selectedTemplate = useMemo(() => getTemplateById(profile?.template_id), [profile?.template_id])
  const brandLogo = businessInfo?.logo_url || profile?.logo_url || ''
  const pharmacyName = businessInfo?.name || profile?.name || 'Your Pharmacy'

  const publishedWebsiteUrl = useMemo(() => {
    if (!profile?.subdomain) return null
    if (!profile?.is_published || !profile?.template_id) return null
    if (typeof window === 'undefined') return null
    return `${window.location.protocol}//${profile.subdomain}.${window.location.host}`
  }, [profile?.subdomain, profile?.is_published, profile?.template_id])

  const isReadyToPublish = useMemo(() => {
    const hasTemplate = Boolean(profile?.template_id)
    const hasInfo = Boolean((businessInfo?.name || '').trim())
    return hasTemplate && hasInfo && !profile?.is_published
  }, [businessInfo?.name, profile?.is_published, profile?.template_id])

  const handlePublish = async () => {
    if (isPublishing) return
    setIsPublishing(true)
    const publishRes = await pharmacyApi.publish()
    if (publishRes.error) {
      showToast({ type: 'error', title: 'Publish failed', message: publishRes.error })
      setIsPublishing(false)
      return
    }
    setProfile((prev) => (prev ? { ...prev, is_published: true } : prev))
    showToast({ type: 'success', title: 'Website published', message: 'Your pharmacy website is now live.' })
    setIsPublishing(false)
  }

  const progressSteps = useMemo(() => [
    { label: 'Template selected', completed: Boolean(profile?.template_id) },
    { label: 'Products uploaded', completed: productStats.total > 0 },
    { label: 'Info completed', completed: Boolean((businessInfo?.name || '').trim()) },
    { label: 'Published', completed: Boolean(profile?.is_published) },
  ], [profile?.template_id, profile?.is_published, productStats.total, businessInfo?.name])

  const completedStepsCount = progressSteps.filter((s) => s.completed).length
  const activeStep = progressSteps.findIndex((s) => !s.completed)
  const completionPercent = Math.round((completedStepsCount / progressSteps.length) * 100)

  const isInventoryHealthy = productStats.low_stock === 0 && productStats.out_of_stock === 0

  // Format last updated
  const lastUpdatedStr = useMemo(() => {
    const raw = productStats.last_updated || profile?.updated_at || null
    if (!raw) return { date: 'Not updated yet', time: '' }
    const d = new Date(raw)
    return {
      date: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }
  }, [productStats.last_updated, profile?.updated_at])

  return (
    <div className="space-y-5 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-xl border border-neutral-border bg-white flex items-center justify-center shadow-sm">
            <BrandLogo
              src={brandLogo}
              alt="Pharmacy logo"
              fallbackText={pharmacyName}
              imageClassName="h-full w-full object-cover"
              fallbackClassName="h-full w-full text-sm font-bold text-primary flex items-center justify-center"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-dark">
              Welcome back, {isLoading ? '...' : pharmacyName} 👋
            </h1>
            <p className="text-sm text-neutral-gray mt-0.5">
              Track your storefront launch, inventory, and publishing status in one place.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/dashboard/business-info">
            <button className="flex items-center gap-2 rounded-xl border border-neutral-border bg-white px-4 py-2.5 text-sm font-medium text-neutral-dark shadow-sm hover:border-primary hover:text-primary transition-colors">
              <FiInfo size={15} />
              Business Info
            </button>
          </Link>
          <Link href="/dashboard/pharmacy/templates">
            <button className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-dark transition-colors">
              <FiLayout size={15} />
              Templates
            </button>
          </Link>
          {isReadyToPublish && (
            <button
              onClick={() => void handlePublish()}
              disabled={isPublishing}
              className="flex items-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              <FiGlobe size={15} />
              {isPublishing ? 'Publishing…' : 'Publish'}
            </button>
          )}
          {publishedWebsiteUrl && (
            <Link href={publishedWebsiteUrl} target="_blank" rel="noopener noreferrer">
              <button className="flex items-center gap-2 rounded-xl border border-success bg-white px-4 py-2.5 text-sm font-medium text-success shadow-sm hover:bg-green-50 transition-colors">
                <FiExternalLink size={15} />
                Open Website
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Top 3 Status Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Launch Readiness */}
        <div className="rounded-2xl border border-neutral-border bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="relative shrink-0">
            <CircleProgress percent={completionPercent} />
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-primary">
              {isLoading ? '…' : `${completionPercent}%`}
            </span>
          </div>
          <div className="flex-1 flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-gray mb-1">Launch Readiness</p>
              {isLoading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                <p className="text-sm text-neutral-dark">
                  {completionPercent === 100 ? 'Your store is ready!' : 'Your store is not ready yet.'}
                </p>
              )}
              <Link href="/dashboard/pharmacy/setup" className="text-xs text-primary font-medium mt-1 inline-block hover:underline">
                View checklist →
              </Link>
            </div>
            <FiEdit3 className="text-neutral-gray mt-0.5" size={16} />
          </div>
        </div>

        {/* Current Template */}
        <div className="rounded-2xl border border-neutral-border bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-gray">Current Template</p>
            <div className="rounded-lg bg-orange-50 p-2">
              <FiLayout className="text-orange-500" size={16} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-50 p-3">
              <FiLayout className="text-orange-500" size={22} />
            </div>
            <div>
              {isLoading ? (
                <Skeleton className="h-5 w-28" />
              ) : (
                <p className="font-semibold text-neutral-dark">
                  {selectedTemplate?.name || 'Not selected yet'}
                </p>
              )}
              <Link href="/dashboard/pharmacy/templates" className="text-xs text-primary font-medium hover:underline">
                Choose template →
              </Link>
            </div>
          </div>
        </div>

        {/* Website Status */}
        <div className="rounded-2xl border border-neutral-border bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-gray">Website Status</p>
            <div className="rounded-lg bg-green-50 p-2">
              <FiEdit3 className="text-green-500" size={16} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full border-2 border-green-400 p-2.5">
              <FiGlobe className="text-green-500" size={20} />
            </div>
            <div>
              {isLoading ? (
                <Skeleton className="h-5 w-20" />
              ) : (
                <p className="font-bold text-xl text-neutral-dark">
                  {profile?.is_published ? 'Published' : 'Draft'}
                </p>
              )}
              <Link
                href={profile?.is_published && publishedWebsiteUrl ? publishedWebsiteUrl : '/dashboard/pharmacy/setup'}
                className="text-xs text-primary font-medium hover:underline"
              >
                Continue setup →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Launch Progress ── */}
      <div className="rounded-2xl border border-neutral-border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold text-neutral-dark">Launch Progress</h2>
          <span className="rounded-full bg-neutral-light px-3 py-1 text-xs font-semibold text-neutral-gray border border-neutral-border">
            {isLoading ? '…' : `${completedStepsCount}/${progressSteps.length} done`}
          </span>
        </div>
        <p className="text-sm text-neutral-gray mb-6">Complete each milestone to unlock a fully published storefront.</p>

        <div className="flex items-start gap-0">
          {progressSteps.map((step, idx) => {
            const isCurrent = !step.completed && idx === (activeStep === -1 ? progressSteps.length : activeStep)
            const isActive = step.completed || isCurrent
            return (
              <div key={idx} className="flex flex-1 items-center">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                    step.completed
                      ? 'bg-primary border-primary text-white'
                      : isCurrent
                      ? 'bg-white border-primary text-primary'
                      : 'bg-white border-neutral-border text-neutral-gray'
                  }`}>
                    {step.completed ? <FiCheckCircle size={18} /> : idx + 1}
                  </div>
                  <p className={`mt-2 text-xs text-center font-medium ${isActive ? 'text-primary' : 'text-neutral-gray'}`}>
                    {step.label}
                  </p>
                </div>
                {idx < progressSteps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 mb-5 ${step.completed ? 'bg-primary' : 'bg-neutral-border'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 4 Mini Stat Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Website Status */}
        <div className="rounded-2xl border border-neutral-border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-green-50 p-2">
              <FiGlobe className="text-green-500" size={16} />
            </div>
            <span className="text-xs text-neutral-gray font-medium">Website Status</span>
          </div>
          {isLoading ? <Skeleton className="h-6 w-16 mt-1" /> : (
            <>
              <p className="text-lg font-bold text-neutral-dark">
                {profile?.is_published ? 'Published' : 'Draft'}
              </p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${profile?.is_published ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                {profile?.is_published ? 'Live' : 'Needs setup'}
              </span>
            </>
          )}
        </div>

        {/* Product Count */}
        <div className="rounded-2xl border border-neutral-border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-purple-50 p-2">
              <FiBox className="text-purple-500" size={16} />
            </div>
            <span className="text-xs text-neutral-gray font-medium">Product Count</span>
          </div>
          {isLoading ? <Skeleton className="h-8 w-12 mt-1" /> : (
            <>
              <p className="text-3xl font-bold text-neutral-dark">{productStats.total}</p>
              <p className="text-xs text-neutral-gray">Total products</p>
            </>
          )}
        </div>

        {/* Last Updated */}
        <div className="rounded-2xl border border-neutral-border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-blue-50 p-2">
              <FiEdit3 className="text-blue-500" size={16} />
            </div>
            <span className="text-xs text-neutral-gray font-medium">Last Updated</span>
          </div>
          {isLoading ? <Skeleton className="h-6 w-28 mt-1" /> : (
            <>
              <p className="text-base font-bold text-neutral-dark">{lastUpdatedStr.date}</p>
              {lastUpdatedStr.time && <p className="text-xs text-neutral-gray">{lastUpdatedStr.time}</p>}
            </>
          )}
        </div>

        {/* Selected Template */}
        <div className="rounded-2xl border border-neutral-border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-orange-50 p-2">
              <FiLayout className="text-orange-500" size={16} />
            </div>
            <span className="text-xs text-neutral-gray font-medium">Selected Template</span>
          </div>
          {isLoading ? <Skeleton className="h-6 w-24 mt-1" /> : (
            <>
              <p className="text-base font-bold text-neutral-dark">
                {selectedTemplate?.name || 'Not selected yet'}
              </p>
              {!selectedTemplate && (
                <Link href="/dashboard/pharmacy/templates" className="text-xs text-primary font-medium hover:underline">
                  Choose a template
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Quick Actions + Inventory Health ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {/* Quick Actions */}
        <div className="rounded-2xl border border-neutral-border bg-white p-6 shadow-sm xl:col-span-3">
          <h2 className="text-base font-bold text-neutral-dark mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              {
                icon: <FiMonitor className="text-primary" size={20} />,
                bg: 'bg-blue-50',
                title: 'Create Website',
                sub: 'Start building your store',
                href: '/dashboard/pharmacy/setup',
              },
              {
                icon: <FiUploadCloud className="text-green-600" size={20} />,
                bg: 'bg-green-50',
                title: 'Add Products',
                sub: 'Upload and manage products',
                href: '/dashboard/pharmacy/products',
              },
              {
                icon: <FiLayout className="text-purple-600" size={20} />,
                bg: 'bg-purple-50',
                title: 'Browse Templates',
                sub: 'Pick a template for your store',
                href: '/dashboard/pharmacy/templates',
              },
              {
                icon: <FiInfo className="text-orange-500" size={20} />,
                bg: 'bg-orange-50',
                title: 'Complete Info',
                sub: 'Add business details',
                href: '/dashboard/business-info',
              },
            ].map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="flex items-center justify-between rounded-xl border border-neutral-border p-4 hover:border-primary hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl ${action.bg} p-2.5`}>{action.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-dark group-hover:text-primary transition-colors">{action.title}</p>
                    <p className="text-xs text-neutral-gray">{action.sub}</p>
                  </div>
                </div>
                <FiArrowRight className="text-neutral-gray group-hover:text-primary transition-colors shrink-0" size={16} />
              </Link>
            ))}
          </div>
        </div>

        {/* Inventory Health */}
        <div className="rounded-2xl border border-neutral-border bg-white p-6 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-neutral-dark">Inventory Health</h2>
            <Link href="/dashboard/pharmacy/products" className="text-xs text-primary font-medium hover:underline">
              View all
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Low Stock */}
            <div className="rounded-xl border border-neutral-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-red-500">Low Stock Items</span>
                <div className="rounded-lg bg-red-50 p-1.5">
                  <FiAlertTriangle className="text-red-400" size={14} />
                </div>
              </div>
              {isLoading ? <Skeleton className="h-8 w-8" /> : (
                <p className={`text-3xl font-bold ${productStats.low_stock > 0 ? 'text-red-500' : 'text-neutral-dark'}`}>
                  {productStats.low_stock}
                </p>
              )}
              <p className="text-xs text-neutral-gray mt-0.5">
                {productStats.low_stock === 0 ? 'No items are low in stock' : 'Items running low'}
              </p>
            </div>

            {/* Out of Stock */}
            <div className="rounded-xl border border-neutral-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-neutral-gray">Out of Stock Items</span>
                <div className="rounded-lg bg-neutral-light p-1.5">
                  <FiPackage className="text-neutral-gray" size={14} />
                </div>
              </div>
              {isLoading ? <Skeleton className="h-8 w-8" /> : (
                <p className={`text-3xl font-bold ${productStats.out_of_stock > 0 ? 'text-orange-500' : 'text-neutral-dark'}`}>
                  {productStats.out_of_stock}
                </p>
              )}
              <p className="text-xs text-neutral-gray mt-0.5">
                {productStats.out_of_stock === 0 ? 'Everything is in stock' : 'Items out of stock'}
              </p>
            </div>
          </div>

          {/* Health Badge */}
          {isLoading ? (
            <Skeleton className="h-10 w-full rounded-xl" />
          ) : isInventoryHealthy ? (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-100 px-4 py-3">
              <FiCheckCircle className="text-green-500 shrink-0" size={16} />
              <span className="text-sm text-green-700 font-medium">Great! Your inventory is healthy.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
              <FiAlertCircle className="text-red-500 shrink-0" size={16} />
              <span className="text-sm text-red-700 font-medium">
                {productStats.out_of_stock + productStats.low_stock} item(s) need attention.
              </span>
            </div>
          )}

          {/* Extra stats */}
          <div className="mt-4 flex items-center justify-between text-xs text-neutral-gray border-t border-neutral-border pt-3">
            <span>Total products: <strong className="text-neutral-dark">{productStats.total}</strong></span>
            <span>Categories: <strong className="text-neutral-dark">{productStats.categories}</strong></span>
          </div>
        </div>
      </div>
    </div>
  )
}
