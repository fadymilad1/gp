'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Toggle } from '@/components/ui/Toggle'
import { useToast } from '@/components/ui/ToastProvider'
import { hospitalAdminApi, type HospitalStaff } from '@/lib/hospitalAdminApi'
import { 
  FiUsers, 
  FiEdit, 
  FiTrash2, 
  FiPlus, 
  FiUser, 
  FiMail, 
  FiLock,
  FiClock,
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiShield
} from 'react-icons/fi'

export default function HospitalStaffPage() {
  const { showToast } = useToast()
  
  // States
  const [staffList, setStaffList] = useState<HospitalStaff[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<HospitalStaff | null>(null)
  
  // Form states
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formConfirmPassword, setFormConfirmPassword] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Load staff
  const loadStaff = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const response = await hospitalAdminApi.listStaff()
    if (response.error) {
      showToast({
        type: 'error',
        title: 'Failed to load staff',
        message: response.error
      })
    } else if (response.data) {
      setStaffList(response.data)
    }
    setLoading(false)
  }, [showToast])

  useEffect(() => {
    void loadStaff()
  }, [loadStaff])

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setSelectedStaff(null)
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormConfirmPassword('')
    setFormIsActive(true)
    setFormErrors({})
    setIsFormModalOpen(true)
  }

  // Open modal for Edit
  const handleOpenEditModal = (staff: HospitalStaff) => {
    setSelectedStaff(staff)
    setFormName(staff.name)
    setFormEmail(staff.email)
    setFormPassword('')
    setFormConfirmPassword('')
    setFormIsActive(staff.is_active)
    setFormErrors({})
    setIsFormModalOpen(true)
  }

  // Handle Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})
    
    const errors: Record<string, string> = {}
    
    if (!formName.trim()) {
      errors.name = 'Full Name is required'
    }
    
    if (!formEmail.trim()) {
      errors.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail)) {
      errors.email = 'Please enter a valid email address'
    }
    
    const isEditing = !!selectedStaff
    
    if (!isEditing) {
      if (!formPassword) {
        errors.password = 'Password is required'
      } else if (formPassword.length < 8) {
        errors.password = 'Password must be at least 8 characters long'
      }
      
      if (formPassword !== formConfirmPassword) {
        errors.confirmPassword = 'Passwords do not match'
      }
    } else {
      if (formPassword) {
        if (formPassword.length < 8) {
          errors.password = 'Password must be at least 8 characters long'
        }
        if (formPassword !== formConfirmPassword) {
          errors.confirmPassword = 'Passwords do not match'
        }
      }
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setSubmitting(true)
    
    const payload: any = {
      name: formName.trim(),
      email: formEmail.trim().toLowerCase(),
      is_active: formIsActive
    }
    
    if (formPassword) {
      payload.password = formPassword
    }

    let response
    if (isEditing && selectedStaff) {
      response = await hospitalAdminApi.updateStaff(selectedStaff.id, payload)
    } else {
      response = await hospitalAdminApi.createStaff(payload)
    }

    if (response.error) {
      const detail = response.error
      if (detail.toLowerCase().includes('email')) {
        setFormErrors({ email: 'A staff member with this email already exists.' })
      } else {
        setFormErrors({ submit: detail })
        showToast({
          type: 'error',
          title: isEditing ? 'Failed to update staff' : 'Failed to create staff',
          message: detail
        })
      }
    } else {
      showToast({
        type: 'success',
        title: isEditing ? 'Staff updated' : 'Staff created',
        message: isEditing 
          ? `Staff member ${formName} was updated successfully.` 
          : `Staff member ${formName} was added successfully.`
      })
      setIsFormModalOpen(false)
      void loadStaff(true)
    }
    setSubmitting(false)
  }

  // Toggle active status in list directly
  const handleToggleStatus = async (staff: HospitalStaff) => {
    const nextActive = !staff.is_active
    
    // Optimistic UI update
    setStaffList(prev => prev.map(s => s.id === staff.id ? { ...s, is_active: nextActive, status: nextActive ? 'Active' : 'Disabled' } : s))
    
    const response = await hospitalAdminApi.updateStaff(staff.id, { is_active: nextActive })
    if (response.error) {
      // Revert UI update
      setStaffList(prev => prev.map(s => s.id === staff.id ? { ...s, is_active: staff.is_active, status: staff.status } : s))
      showToast({
        type: 'error',
        title: 'Failed to toggle status',
        message: response.error
      })
    } else {
      showToast({
        type: 'success',
        title: 'Status updated',
        message: `${staff.name} is now ${nextActive ? 'Active' : 'Disabled'}.`
      })
    }
  }

  // Confirm delete modal
  const handleOpenDeleteModal = (staff: HospitalStaff) => {
    setSelectedStaff(staff)
    setIsDeleteModalOpen(true)
  }

  // Handle Delete
  const handleDeleteStaff = async () => {
    if (!selectedStaff) return
    
    setSubmitting(true)
    const response = await hospitalAdminApi.deleteStaff(selectedStaff.id)
    if (response.error) {
      showToast({
        type: 'error',
        title: 'Failed to delete staff member',
        message: response.error
      })
    } else {
      showToast({
        type: 'success',
        title: 'Staff deleted',
        message: `Staff member ${selectedStaff.name} was removed.`
      })
      setIsDeleteModalOpen(false)
      void loadStaff(true)
    }
    setSubmitting(false)
  }

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staffList
    const query = searchQuery.toLowerCase()
    return staffList.filter(
      s => s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query)
    )
  }, [staffList, searchQuery])

  return (
    <div className="space-y-6 pb-8 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-dark flex items-center gap-2">
            <FiShield className="text-primary shrink-0" /> Staff Management
          </h1>
          <p className="text-sm text-neutral-gray mt-1">
            Manage hospital accounts for your employees. They will only have access to view and manage appointments and patients.
          </p>
        </div>
        <Button 
          type="button" 
          variant="primary" 
          className="text-sm shrink-0 flex items-center gap-2"
          onClick={handleOpenCreateModal}
        >
          <FiPlus /> Add Staff Member
        </Button>
      </div>

      {/* Control bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-3.5 text-neutral-gray" size={18} />
          <input
            type="text"
            placeholder="Search staff by name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-border bg-white text-neutral-dark text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Staff Grid/Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <p className="text-neutral-gray animate-pulse">Loading staff members...</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <Card className="p-12 text-center border border-neutral-border">
          <FiUsers className="mx-auto mb-4 text-neutral-gray" size={48} />
          <h3 className="text-lg font-semibold text-neutral-dark mb-1">No staff members found</h3>
          <p className="text-sm text-neutral-gray max-w-md mx-auto mb-6">
            {searchQuery.trim() 
              ? `We couldn't find any staff members matching "${searchQuery}".`
              : 'Add staff accounts so your employees can view and process appointments.'}
          </p>
          {!searchQuery.trim() && (
            <Button type="button" variant="primary" onClick={handleOpenCreateModal}>
              Add Your First Staff Member
            </Button>
          )}
        </Card>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-border">
              <thead className="bg-neutral-light">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-gray uppercase tracking-wider">Staff Details</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-gray uppercase tracking-wider">Email Address</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-gray uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-gray uppercase tracking-wider">Created Date</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-gray uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-border bg-white">
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-neutral-light/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-bold">
                          {staff.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-neutral-dark">{staff.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-gray">
                      {staff.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                        staff.is_active 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : 'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                        {staff.is_active ? <FiCheckCircle /> : <FiXCircle />}
                        {staff.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-gray">
                      <span className="flex items-center gap-1.5">
                        <FiClock size={14} />
                        {new Date(staff.created_at).toLocaleDateString(undefined, { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => void handleToggleStatus(staff)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                            staff.is_active
                              ? 'border-red-200 text-red-600 hover:bg-red-50'
                              : 'border-green-200 text-green-700 hover:bg-green-50'
                          }`}
                          title={staff.is_active ? 'Deactivate staff member' : 'Activate staff member'}
                        >
                          {staff.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(staff)}
                          className="p-2 text-neutral-gray hover:text-primary hover:bg-neutral-light rounded-lg transition-colors"
                          title="Edit staff details"
                        >
                          <FiEdit size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteModal(staff)}
                          className="p-2 text-neutral-gray hover:text-error hover:bg-neutral-light rounded-lg transition-colors"
                          title="Delete staff account"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={selectedStaff ? 'Edit Staff Member' : 'Add Staff Member'}
        size="md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formErrors.submit && (
            <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm">
              {formErrors.submit}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-semibold text-neutral-dark block">Full Name</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-neutral-gray">
                <FiUser size={18} />
              </span>
              <input
                type="text"
                placeholder="John Doe"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white text-neutral-dark text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                  formErrors.name ? 'border-red-500 focus:border-red-500' : 'border-neutral-border focus:border-primary'
                }`}
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value)
                  if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }))
                }}
                required
                disabled={submitting}
              />
            </div>
            {formErrors.name && (
              <span className="text-xs text-red-500 mt-1 block">{formErrors.name}</span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-neutral-dark block">Email Address</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-neutral-gray">
                <FiMail size={18} />
              </span>
              <input
                type="email"
                placeholder="john@example.com"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white text-neutral-dark text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                  formErrors.email ? 'border-red-500 focus:border-red-500' : 'border-neutral-border focus:border-primary'
                }`}
                value={formEmail}
                onChange={(e) => {
                  setFormEmail(e.target.value)
                  if (formErrors.email) setFormErrors(prev => ({ ...prev, email: '' }))
                }}
                required
                disabled={submitting || !!selectedStaff}
              />
            </div>
            {formErrors.email && (
              <span className="text-xs text-red-500 mt-1 block">{formErrors.email}</span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-neutral-dark block">
              Password {selectedStaff && <span className="text-xs text-neutral-gray font-normal">(Leave blank to keep current)</span>}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-neutral-gray">
                <FiLock size={18} />
              </span>
              <input
                type="password"
                placeholder={selectedStaff ? "••••••••" : "At least 8 characters"}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white text-neutral-dark text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                  formErrors.password ? 'border-red-500 focus:border-red-500' : 'border-neutral-border focus:border-primary'
                }`}
                value={formPassword}
                onChange={(e) => {
                  setFormPassword(e.target.value)
                  if (formErrors.password) setFormErrors(prev => ({ ...prev, password: '' }))
                }}
                required={!selectedStaff}
                disabled={submitting}
              />
            </div>
            {formErrors.password && (
              <span className="text-xs text-red-500 mt-1 block">{formErrors.password}</span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-neutral-dark block">Confirm Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-neutral-gray">
                <FiLock size={18} />
              </span>
              <input
                type="password"
                placeholder={selectedStaff ? "••••••••" : "Repeat password"}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white text-neutral-dark text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                  formErrors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-neutral-border focus:border-primary'
                }`}
                value={formConfirmPassword}
                onChange={(e) => {
                  setFormConfirmPassword(e.target.value)
                  if (formErrors.confirmPassword) setFormErrors(prev => ({ ...prev, confirmPassword: '' }))
                }}
                required={formPassword.length > 0}
                disabled={submitting}
              />
            </div>
            {formErrors.confirmPassword && (
              <span className="text-xs text-red-500 mt-1 block">{formErrors.confirmPassword}</span>
            )}
          </div>

          <div className="py-2">
            <Toggle
              label="Active Status"
              description="Allow this staff member to log in and process appointments."
              checked={formIsActive}
              onChange={setFormIsActive}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-border">
            <Button
              type="button"
              variant="secondary"
              className="text-sm"
              onClick={() => setIsFormModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="text-sm"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Staff Member'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Staff Account"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-gray">
            Are you sure you want to delete staff account for <strong>{selectedStaff?.name}</strong>? This action cannot be undone and they will lose access immediately.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="text-sm"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-sm bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
              onClick={handleDeleteStaff}
              disabled={submitting}
            >
              {submitting ? 'Deleting...' : 'Delete Staff Account'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
