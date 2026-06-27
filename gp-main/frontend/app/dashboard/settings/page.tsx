'use client'

import Link from 'next/link'
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiAlertTriangle, FiGlobe, FiInfo, FiLogOut, FiTrash2 } from 'react-icons/fi'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/ToastProvider'
import { authApi } from '@/lib/api'
import { clearAuthSession, logoutUser } from '@/lib/auth'
import { pharmacyApi } from '@/lib/pharmacy'
import { getTemplateById } from '@/lib/pharmacyTemplates'
import { removePublicSiteItem, setPublicSiteItem } from '@/lib/storage'

type UserProfile = {
  name: string
  email: string
  businessType: 'hospital' | 'pharmacy'
}

export default function SettingsPage() {
  const router = useRouter()
  const { showToast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    email: '',
    businessType: 'hospital',
  })
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [isPublished, setIsPublished] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deleteAccountEmail, setDeleteAccountEmail] = useState('')
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('')
  const [deleteAccountConfirmation, setDeleteAccountConfirmation] = useState('')
  const [deleteAccountError, setDeleteAccountError] = useState('')

  useEffect(() => {
    const userRaw = localStorage.getItem('user')
    if (!userRaw) {
      router.push('/login')
      return
    }

    try {
      const user = JSON.parse(userRaw)
      const businessType = (user.businessType || user.business_type || 'hospital') as 'hospital' | 'pharmacy'

      setUserProfile({
        name: user.name || '',
        email: user.email || '',
        businessType,
      })
      setDeleteAccountEmail(user.email || '')

      if (businessType === 'pharmacy') {
        pharmacyApi.getProfile().then((res) => {
          setSelectedTemplateId(res.data?.template_id || null)
          setIsPublished(Boolean(res.data?.is_published))
          if (res.error) {
            showToast({ type: 'error', title: 'Could not load pharmacy settings', message: res.error })
          }
          setIsLoading(false)
        })
      } else {
        setIsLoading(false)
      }
    } catch {
      router.push('/dashboard')
    }
  }, [router, showToast])

  const selectedTemplate = useMemo(() => getTemplateById(selectedTemplateId), [selectedTemplateId])

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)

    const logoutError = await logoutUser()
    if (logoutError) {
      showToast({
        type: 'info',
        title: 'Signed out locally',
        message: 'Server logout failed, but your local session was cleared.',
      })
    }

    router.push('/login')
    router.refresh()
    setIsLoggingOut(false)
  }

  const openDeleteAccountModal = () => {
    setDeleteAccountEmail(userProfile.email)
    setDeleteAccountPassword('')
    setDeleteAccountConfirmation('')
    setDeleteAccountError('')
    setIsDeleteAccountModalOpen(true)
  }

  const handleDeleteAccount = async () => {
    setDeleteAccountError('')

    if (deleteAccountEmail.trim().toLowerCase() !== userProfile.email.toLowerCase()) {
      setDeleteAccountError('Please enter your current account email exactly.')
      return
    }

    if (deleteAccountConfirmation.trim().toUpperCase() !== 'DELETE') {
      setDeleteAccountError('Type DELETE to confirm account removal.')
      return
    }

    if (!deleteAccountPassword) {
      setDeleteAccountError('Password is required to delete your account.')
      return
    }

    setIsDeletingAccount(true)

    const response = await authApi.deleteAccount({
      email: deleteAccountEmail.trim(),
      password: deleteAccountPassword,
      confirmation_text: deleteAccountConfirmation.trim(),
    })

    if (response.error) {
      setDeleteAccountError(response.error)
      setIsDeletingAccount(false)
      return
    }

    clearAuthSession()
    showToast({
      type: 'success',
      title: 'Account deleted',
      message: 'Your account and associated data were permanently removed.',
    })

    setIsDeletingAccount(false)
    setIsDeleteAccountModalOpen(false)
    router.replace('/signup')
    router.refresh()
  }

  const handleDeleteWebsite = async () => {
    const confirmed = window.confirm('Delete your pharmacy website and all products? This action cannot be undone.')
    if (!confirmed) return

    const response = await pharmacyApi.deleteWebsite()
    if (response.error) {
      showToast({ type: 'error', title: 'Delete failed', message: response.error })
      return
    }

    showToast({ type: 'success', title: 'Website deleted', message: 'Your pharmacy website data has been removed.' })
    removePublicSiteItem('businessInfo')
    removePublicSiteItem('pharmacySetup')
    removePublicSiteItem('selectedTemplate')
    removePublicSiteItem('templateSubscriptionStartedAt')
    removePublicSiteItem('totalPrice')
    removePublicSiteItem('isPublished')
    router.push('/dashboard/pharmacy/setup')
  }

  const handleRepublish = async () => {
    const publishRes = await pharmacyApi.publish()
    if (publishRes.error) {
      showToast({ type: 'error', title: 'Publish failed', message: publishRes.error })
      return
    }

    setIsPublished(true)
    setPublicSiteItem('isPublished', 'true')
    showToast({ type: 'success', title: 'Website published', message: 'Your pharmacy website is now live.' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-dark">Settings</h1>
        <p className="text-neutral-gray mt-1">Manage account preferences and website lifecycle controls.</p>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-neutral-dark">Profile</h2>
        {isLoading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Full Name" value={userProfile.name} readOnly />
            <Input label="Email" value={userProfile.email} readOnly />
          </div>
        )}
      </Card>

      {userProfile.businessType === 'pharmacy' ? (
        <>
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-neutral-dark">Website Settings</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-neutral-border p-4">
                <div className="text-sm text-neutral-gray">Current template</div>
                <div className="mt-1 text-lg font-semibold text-neutral-dark">
                  {selectedTemplate?.name || 'No template selected'}
                </div>
                <Link href="/dashboard/pharmacy/templates" className="mt-3 inline-flex items-center text-sm text-primary">
                  Change template
                </Link>
              </div>

              <div className="rounded-lg border border-neutral-border p-4">
                <div className="text-sm text-neutral-gray">Publication status</div>
                <div className="mt-1 text-lg font-semibold text-neutral-dark">{isPublished ? 'Published' : 'Draft'}</div>
                {!isPublished ? (
                  <button type="button" className="mt-3 text-sm text-primary" onClick={handleRepublish}>
                    Publish website
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/dashboard/business-info">
                <Button variant="secondary">
                  <FiInfo className="mr-2" /> Edit business info
                </Button>
              </Link>
              <Link href="/dashboard/pharmacy/templates">
                <Button variant="secondary">
                  <FiGlobe className="mr-2" /> Open website templates
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="border-2 border-error p-6">
            <h2 className="text-xl font-semibold text-error">Danger Zone</h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold text-neutral-dark">Delete Website</div>
                <p className="text-sm text-neutral-gray">Remove pharmacy website profile, products, and business info.</p>
              </div>
              <Button className="bg-error hover:bg-red-600" onClick={handleDeleteWebsite}>
                <FiTrash2 className="mr-2" /> Delete Website
              </Button>
            </div>
          </Card>
        </>
      ) : null}

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-neutral-dark">Session</h2>
        <div className="mt-4 flex justify-between">
          <p className="text-sm text-neutral-gray">Sign out from the current account.</p>
          <Button variant="secondary" onClick={handleLogout} disabled={isLoggingOut}>
            <FiLogOut className="mr-2" /> {isLoggingOut ? 'Logging out...' : 'Logout'}
          </Button>
        </div>
      </Card>

      <Card className="border-2 border-error p-6">
        <h2 className="text-xl font-semibold text-error">Account Danger Zone</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold text-neutral-dark">Delete Account</div>
            <p className="text-sm text-neutral-gray">Permanently remove your account and all connected Medify data.</p>
          </div>
          <Button className="bg-error hover:bg-red-600" onClick={openDeleteAccountModal}>
            <FiAlertTriangle className="mr-2" /> Delete Account
          </Button>
        </div>
      </Card>

      <Modal
        isOpen={isDeleteAccountModalOpen}
        onClose={() => {
          if (isDeletingAccount) return
          setIsDeleteAccountModalOpen(false)
        }}
        title="Delete Account"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-gray">
            This action is permanent. To continue, confirm your email, type DELETE, and enter your password.
          </p>

          <Input
            label="Account email"
            type="email"
            value={deleteAccountEmail}
            onChange={(event) => setDeleteAccountEmail(event.target.value)}
            placeholder="you@example.com"
            disabled={isDeletingAccount}
          />

          <Input
            label="Type DELETE"
            value={deleteAccountConfirmation}
            onChange={(event) => setDeleteAccountConfirmation(event.target.value)}
            placeholder="DELETE"
            disabled={isDeletingAccount}
          />

          <Input
            label="Password"
            type="password"
            value={deleteAccountPassword}
            onChange={(event) => setDeleteAccountPassword(event.target.value)}
            placeholder="Enter your current password"
            disabled={isDeletingAccount}
          />

          {deleteAccountError ? <p className="text-sm text-error">{deleteAccountError}</p> : null}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setIsDeleteAccountModalOpen(false)}
              disabled={isDeletingAccount}
            >
              Cancel
            </Button>
            <Button className="bg-error hover:bg-red-600" onClick={handleDeleteAccount} disabled={isDeletingAccount}>
              {isDeletingAccount ? 'Deleting...' : 'Permanently Delete Account'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
