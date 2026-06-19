/**
 * Shared helpers for pharmacy orders (dashboard stats + orders page).
 */

import { getScopedItem, getStoragePrefix } from './storage'

export type OrderStatus = 'pending' | 'completed' | 'cancelled'

export type Order = {
  id: string
  customerName: string
  customerEmail?: string
  total: number
  status: OrderStatus
  createdAt: string
  items: string[]
}

const ORDER_KEY_PREFIXES = ['pharmacy_order_', 'pharmacy2_order_', 'pharmacy3_order_']

export function getPharmacyOrders(): Order[] {
  if (typeof window === 'undefined') return []
  const byId = new Map<string, Order>()
  const prefix = getStoragePrefix()

  try {
    const list = getScopedItem('pharmacyOrders')
    if (list) {
      const parsed = JSON.parse(list)
      if (Array.isArray(parsed)) {
        parsed.forEach((o: Order) => byId.set(o.id, { ...o, status: o.status || 'pending' }))
      }
    }
  } catch {
    // ignore
  }

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !prefix) continue
      if (!key.startsWith(prefix)) continue
      const suffix = key.slice(prefix.length)
      if (!ORDER_KEY_PREFIXES.some((p) => suffix.startsWith(p))) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const data = JSON.parse(raw) as {
        orderNumber?: string
        placedAt?: string
        total?: number
        deliveryInfo?: { fullName?: string; email?: string }
        items?: Array<{ product?: { name?: string }; quantity?: number }>
      }
      const id = data.orderNumber || key.replace(/^.*_order_/, 'ORD-')
      if (byId.has(id)) continue
      const customerName = data.deliveryInfo?.fullName?.trim() || 'Customer'
      const customerEmail = data.deliveryInfo?.email?.trim()
      const items: string[] = Array.isArray(data.items)
        ? data.items.map((it) => {
            const name = it.product?.name || 'Item'
            const qty = it.quantity && it.quantity > 1 ? ` × ${it.quantity}` : ''
            return `${name}${qty}`
          })
        : []
      byId.set(id, {
        id,
        customerName,
        customerEmail,
        total: typeof data.total === 'number' ? data.total : 0,
        status: 'pending',
        createdAt: data.placedAt || new Date().toISOString(),
        items,
      })
    }
  } catch {
    // ignore
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

/** Compute dashboard stats from orders: total, pending, cancelled, and % change vs last month. */
export function getPharmacyOrdersStats(orders: Order[]): {
  totalOrders: number
  totalOrdersChange: number
  pendingOrders: number
  pendingOrdersChange: number
  cancelledOrders: number
  cancelledOrdersChange: number
  monthlyOrders: number
  monthlyOrdersChange: number
} {
  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth()
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear

  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.getFullYear() === thisYear && d.getMonth() === thisMonth
  }
  const isLastMonth = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth
  }

  const totalOrders = orders.length
  const pendingOrders = orders.filter((o) => o.status === 'pending').length
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length
  const thisMonthOrders = orders.filter((o) => isThisMonth(o.createdAt))
  const lastMonthOrders = orders.filter((o) => isLastMonth(o.createdAt))
  const monthlyOrders = thisMonthOrders.length
  const lastMonthCount = lastMonthOrders.length

  const pendingThisMonth = orders.filter((o) => o.status === 'pending' && isThisMonth(o.createdAt)).length
  const pendingLastMonth = orders.filter((o) => o.status === 'pending' && isLastMonth(o.createdAt)).length
  const cancelledThisMonth = orders.filter((o) => o.status === 'cancelled' && isThisMonth(o.createdAt)).length
  const cancelledLastMonth = orders.filter((o) => o.status === 'cancelled' && isLastMonth(o.createdAt)).length

  const totalOrdersChange =
    lastMonthCount > 0
      ? Math.round(((monthlyOrders - lastMonthCount) / lastMonthCount) * 100)
      : monthlyOrders > 0
        ? 100
        : 0
  const monthlyOrdersChange = totalOrdersChange
  const pendingOrdersChange =
    pendingLastMonth > 0
      ? Math.round(((pendingThisMonth - pendingLastMonth) / pendingLastMonth) * 100)
      : pendingThisMonth > 0
        ? 100
        : 0
  const cancelledOrdersChange =
    cancelledLastMonth > 0
      ? Math.round(((cancelledThisMonth - cancelledLastMonth) / cancelledLastMonth) * 100)
      : cancelledThisMonth > 0
        ? 100
        : 0

  return {
    totalOrders,
    totalOrdersChange,
    pendingOrders,
    pendingOrdersChange,
    cancelledOrders,
    cancelledOrdersChange,
    monthlyOrders,
    monthlyOrdersChange,
  }
}
