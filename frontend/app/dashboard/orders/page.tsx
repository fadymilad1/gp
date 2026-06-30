'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  FiShoppingCart,
  FiMapPin,
  FiPhone,
  FiMail,
  FiPackage,
  FiCreditCard,
  FiTruck,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi'
import { useToast } from '@/components/ui/ToastProvider'
import { getPharmacyOrders, type Order as LocalOrder } from '@/lib/orders'
import {
  markOwnerPharmacyOrdersSeen,
  listOwnerPharmacyOrders,
  updateOwnerPharmacyOrderStatus,
  deletePharmacyOrder,
  type PharmacyOrder,
  type PharmacyOrderStatus,
} from '@/lib/pharmacyOrders'


type DashboardOrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled'

type DashboardOrder = {
  id: string
  apiId?: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  deliveryMethod?: 'delivery' | 'pickup'
  paymentMethod?: 'cash' | 'card'
  paymentStatus?: 'pending' | 'paid'
  paymentLast4?: string
  notes?: string
  total: number
  subtotal?: number
  deliveryFee?: number
  status: DashboardOrderStatus
  createdAt: string
  items: string[]
}

const mapApiOrder = (order: PharmacyOrder): DashboardOrder => ({
  id: order.order_number,
  apiId: order.id,
  customerName: order.patient_name,
  customerEmail: order.patient_email,
  customerPhone: order.patient_phone,
  address: order.address,
  city: order.city,
  state: order.state,
  zipCode: order.zip_code,
  deliveryMethod: order.delivery_method,
  paymentMethod: order.payment_method,
  paymentStatus: order.payment_status,
  paymentLast4: order.payment_last4,
  notes: order.notes,
  total: Number.parseFloat(order.total || '0') || 0,
  subtotal: Number.parseFloat(order.subtotal || '0') || 0,
  deliveryFee: Number.parseFloat(order.delivery_fee || '0') || 0,
  status: order.status,
  createdAt: order.created_at,
  items: (order.items || []).map((item) =>
    `${item.product_name}${item.quantity > 1 ? ` × ${item.quantity}` : ''}`,
  ),
})

const mapLocalOrder = (order: LocalOrder): DashboardOrder => ({
  id: order.id,
  customerName: order.customerName,
  customerEmail: order.customerEmail,
  total: order.total,
  status: order.status,
  createdAt: order.createdAt,
  items: order.items,
})

// ── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    bg: 'bg-amber-50 text-amber-700 border border-amber-200',
    icon: <FiClock size={12} />,
  },
  processing: {
    label: 'Processing',
    bg: 'bg-blue-50 text-blue-700 border border-blue-200',
    icon: <FiPackage size={12} />,
  },
  completed: {
    label: 'Completed',
    bg: 'bg-green-50 text-green-700 border border-green-200',
    icon: <FiCheckCircle size={12} />,
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-red-50 text-red-600 border border-red-200',
    icon: <FiXCircle size={12} />,
  },
}

// ── Single order card ────────────────────────────────────────────────────────
function OrderCard({
  order,
  isHospital,
  onUpdateStatus,
  onDelete,
}: {
  order: DashboardOrder
  isHospital: boolean
  onUpdateStatus: (order: DashboardOrder, status: PharmacyOrderStatus) => Promise<void>
  onDelete: (order: DashboardOrder) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
  const isPending = order.status === 'pending'
  const isProcessing = order.status === 'processing'
  const isCancelled = order.status === 'cancelled'

  const fullAddress = [order.address, order.city, order.state, order.zipCode]
    .filter(Boolean)
    .join(', ')

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(order)
    setDeleting(false)
  }

  return (
    <div className="rounded-2xl border border-neutral-border bg-white shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="font-bold text-neutral-dark text-sm tracking-wide">{order.id}</span>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg}`}>
            {cfg.icon}
            {cfg.label}
          </span>
        </div>

        {/* Customer */}
        <p className="font-semibold text-neutral-dark text-base">{order.customerName}</p>
        <div className="mt-1 space-y-0.5">
          {order.customerEmail && (
            <p className="flex items-center gap-1.5 text-xs text-neutral-gray">
              <FiMail size={11} className="shrink-0" />
              {order.customerEmail}
            </p>
          )}
          {order.customerPhone && (
            <p className="flex items-center gap-1.5 text-xs text-neutral-gray">
              <FiPhone size={11} className="shrink-0" />
              {order.customerPhone}
            </p>
          )}
          {fullAddress && (
            <p className="flex items-center gap-1.5 text-xs text-neutral-gray">
              <FiMapPin size={11} className="shrink-0" />
              {fullAddress}
            </p>
          )}
        </div>

        {/* Amount */}
        <p className="mt-3 text-2xl font-bold text-primary">${order.total.toFixed(2)}</p>
        <p className="text-xs text-neutral-gray mt-0.5">
          {new Date(order.createdAt).toLocaleString()}
        </p>

        {/* Items */}
        {order.items.length > 0 && (
          <ul className="mt-3 list-disc list-inside space-y-0.5">
            {order.items.slice(0, expanded ? undefined : 3).map((item, i) => (
              <li key={i} className="text-sm text-neutral-dark truncate">{item}</li>
            ))}
            {!expanded && order.items.length > 3 && (
              <li className="text-xs text-neutral-gray">+{order.items.length - 3} more</li>
            )}
          </ul>
        )}
      </div>

      {/* ── Expanded details ── */}
      {expanded && (
        <div className="border-t border-neutral-border px-5 py-4 bg-neutral-light space-y-3 text-xs text-neutral-dark">
          <div className="grid grid-cols-2 gap-3">
            {order.deliveryMethod && (
              <div className="flex items-center gap-2">
                <FiTruck className="text-neutral-gray shrink-0" size={14} />
                <div>
                  <p className="text-neutral-gray font-medium uppercase tracking-wide" style={{ fontSize: 10 }}>Delivery</p>
                  <p className="font-semibold capitalize">{order.deliveryMethod}</p>
                </div>
              </div>
            )}
            {order.paymentMethod && (
              <div className="flex items-center gap-2">
                <FiCreditCard className="text-neutral-gray shrink-0" size={14} />
                <div>
                  <p className="text-neutral-gray font-medium uppercase tracking-wide" style={{ fontSize: 10 }}>Payment</p>
                  <p className="font-semibold capitalize">
                    {order.paymentMethod}{order.paymentLast4 ? ` ···· ${order.paymentLast4}` : ''}
                  </p>
                </div>
              </div>
            )}
            {order.paymentStatus && (
              <div>
                <p className="text-neutral-gray font-medium uppercase tracking-wide" style={{ fontSize: 10 }}>Payment Status</p>
                <p className={`font-semibold capitalize ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                  {order.paymentStatus}
                </p>
              </div>
            )}
          </div>

          {/* Price breakdown */}
          {order.subtotal !== undefined && (
            <div className="rounded-xl border border-neutral-border bg-white p-3 space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-gray">Subtotal</span>
                <span className="font-medium">${(order.subtotal || 0).toFixed(2)}</span>
              </div>
              {(order.deliveryFee ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-neutral-gray">Delivery fee</span>
                  <span className="font-medium">${(order.deliveryFee || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-neutral-border pt-1 mt-1">
                <span className="font-bold text-neutral-dark">Total</span>
                <span className="font-bold text-primary">${order.total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div>
              <p className="text-neutral-gray font-medium uppercase tracking-wide mb-1" style={{ fontSize: 10 }}>Notes</p>
              <p className="italic text-neutral-dark">{order.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="px-5 py-3 border-t border-neutral-border flex flex-wrap items-center gap-2">
        <button
          className="flex items-center gap-1 text-xs text-neutral-gray hover:text-primary transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          {expanded ? 'Hide details' : 'Show details'}
        </button>

        <div className="ml-auto flex flex-wrap gap-2">
          {!isHospital && isPending && (
            <>
              <button
                onClick={() => onUpdateStatus(order, 'processing')}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
              >
                Mark Processing
              </button>
              <button
                onClick={() => onUpdateStatus(order, 'cancelled')}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-neutral-border text-neutral-gray hover:bg-neutral-light transition-colors"
              >
                Cancel
              </button>
            </>
          )}
          {!isHospital && isProcessing && (
            <>
              <button
                onClick={() => onUpdateStatus(order, 'completed')}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
              >
                Mark Completed
              </button>
              <button
                onClick={() => onUpdateStatus(order, 'cancelled')}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-neutral-border text-neutral-gray hover:bg-neutral-light transition-colors"
              >
                Cancel
              </button>
            </>
          )}
          {!isHospital && isCancelled && (
            <button
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-60"
            >
              <FiTrash2 size={12} />
              {deleting ? 'Deleting…' : 'Delete Order'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const { showToast } = useToast()

  const [orders, setOrders] = useState<DashboardOrder[]>([])

  const [loading, setLoading] = useState(true)
  const [userType, setUserType] = useState<'hospital' | 'pharmacy'>('pharmacy')
  const [markingViewed, setMarkingViewed] = useState(false)
  const [filterStatus, setFilterStatus] = useState<DashboardOrderStatus | 'all'>('all')

  const knownOrderIdsRef = useRef<Set<string>>(new Set())
  const hasLoadedInitialOrdersRef = useRef(false)

  const isHospital = useMemo(() => userType === 'hospital', [userType])

  const emitUnseenCountUpdate = useCallback((count: number) => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('pharmacy-unseen-orders-count', { detail: { count } }))
  }, [])

  const markAllOrdersAsViewed = useCallback(async (silent = false) => {
    if (isHospital) return
    if (!silent) setMarkingViewed(true)
    const response = await markOwnerPharmacyOrdersSeen()
    if (response.error) {
      if (!silent) showToast({ type: 'error', title: 'Could not mark orders viewed', message: response.error })
      if (!silent) setMarkingViewed(false)
      return
    }
    const remaining = Number(response.data?.remaining_unseen || 0)
    emitUnseenCountUpdate(remaining)
    if (!silent) {
      showToast({ type: 'success', title: 'Orders marked as viewed', message: remaining > 0 ? `${remaining} unseen remain.` : 'No unseen orders left.' })
      setMarkingViewed(false)
    }
  }, [emitUnseenCountUpdate, isHospital, showToast])

  const loadOrders = useCallback(async (silent = false) => {
    if (isHospital) {
      setOrders(getPharmacyOrders().map(mapLocalOrder))
      setLoading(false)
      return
    }
    const response = await listOwnerPharmacyOrders()
    if (response.error) {
      if (!silent) showToast({ type: 'error', title: 'Could not load orders', message: response.error })
      setLoading(false)
      return
    }
    const nextOrders = (response.data || []).map(mapApiOrder)
    let shouldMarkSeen = false
    if (hasLoadedInitialOrdersRef.current) {
      const newOrders = nextOrders.filter((o) => !knownOrderIdsRef.current.has(o.id))
      if (newOrders.length > 0) {
        const first = newOrders[0]
        showToast({ type: 'info', title: 'New order received', message: `${first.customerName} placed an order.` })
        shouldMarkSeen = true
      }
    } else if (nextOrders.length > 0) {
      shouldMarkSeen = true
    }
    knownOrderIdsRef.current = new Set(nextOrders.map((o) => o.id))
    hasLoadedInitialOrdersRef.current = true
    setOrders(nextOrders)

    setLoading(false)
    if (shouldMarkSeen) await markAllOrdersAsViewed(true)
  }, [isHospital, markAllOrdersAsViewed, showToast])

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try { setUserType(JSON.parse(userData).businessType || JSON.parse(userData).business_type || 'hospital') }
      catch { setUserType('hospital') }
    }
  }, [])

  useEffect(() => { void loadOrders() }, [loadOrders])

  useEffect(() => {
    if (isHospital) return
    const id = window.setInterval(() => void loadOrders(true), 8000)
    return () => window.clearInterval(id)
  }, [isHospital, loadOrders])

  useEffect(() => {
    if (isHospital) return
    void markAllOrdersAsViewed(true)
  }, [isHospital, markAllOrdersAsViewed])

  const updateStatus = async (order: DashboardOrder, status: PharmacyOrderStatus) => {
    if (isHospital || !order.apiId) {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)))
      return
    }
    const response = await updateOwnerPharmacyOrderStatus(order.apiId, status)
    if (response.error) { showToast({ type: 'error', title: 'Status update failed', message: response.error }); return }
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)))
  }

  const deleteOrder = async (order: DashboardOrder) => {
    if (!order.apiId) { setOrders((prev) => prev.filter((o) => o.id !== order.id)); return }
    const response = await deletePharmacyOrder(order.apiId)
    if (response.error) { showToast({ type: 'error', title: 'Delete failed', message: response.error }); return }
    setOrders((prev) => prev.filter((o) => o.id !== order.id))
    showToast({ type: 'success', title: 'Order deleted', message: `Order ${order.id} has been removed.` })
  }



  const filteredOrders = useMemo(
    () => filterStatus === 'all' ? orders : orders.filter((o) => o.status === filterStatus),
    [orders, filterStatus],
  )

  const counts = useMemo(() => ({
    all: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    processing: orders.filter((o) => o.status === 'processing').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  }), [orders])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-neutral-gray animate-pulse">{isHospital ? 'Loading appointments…' : 'Loading orders…'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-8 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-dark">{isHospital ? 'Appointments' : 'Orders'}</h1>
          <p className="text-sm text-neutral-gray mt-0.5">
            {isHospital ? 'Patient appointments from your hospital website.' : 'Customer orders from your pharmacy storefront.'}
          </p>
        </div>
        {!isHospital && (
          <Button type="button" variant="secondary" className="text-sm shrink-0" onClick={() => void markAllOrdersAsViewed(false)} disabled={markingViewed}>
            {markingViewed ? 'Marking…' : 'Mark All Viewed'}
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      {!isHospital && (
        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'processing', 'completed', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filterStatus === s
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-neutral-gray border-neutral-border hover:border-primary hover:text-primary'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className={`ml-1.5 ${filterStatus === s ? 'opacity-80' : 'text-neutral-gray'}`}>
                ({counts[s]})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Orders grid */}
      {filteredOrders.length === 0 ? (
        <Card className="p-10 text-center">
          <FiShoppingCart className="mx-auto mb-3 text-neutral-gray" size={40} />
          <p className="text-neutral-gray">{isHospital ? 'No appointments yet.' : 'No orders in this category.'}</p>
          <p className="text-xs text-neutral-gray mt-1">
            {isHospital ? 'Appointments will appear here once booked.' : 'Orders placed on your website will appear here.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isHospital={isHospital}
              onUpdateStatus={updateStatus}
              onDelete={deleteOrder}
            />
          ))}
        </div>
      )}


    </div>
  )
}
