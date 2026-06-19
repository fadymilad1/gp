import {
  getItemForUser,
  getSiteOwnerId,
  getStoredUser,
  setItemForUser,
  getScopedItem,
  setScopedItem,
} from './storage'

export type PharmacyInboxMessageType = 'contact' | 'refill'
export type PharmacyInboxMessageStatus = 'new' | 'resolved'

export type PharmacyInboxMessage = {
  id: string
  type: PharmacyInboxMessageType
  name: string
  contact: string
  message: string
  createdAt: string
  status: PharmacyInboxMessageStatus
  source: string
}

type InboxInput = {
  type: PharmacyInboxMessageType
  name: string
  contact: string
  message: string
  source: string
}

const INBOX_KEY = 'pharmacyInbox'

const parseMessages = (raw: string | null): PharmacyInboxMessage[] => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const resolveOwnerId = (explicitOwnerId?: string): string | null => {
  if (explicitOwnerId) return explicitOwnerId
  const siteOwnerId = getSiteOwnerId()
  if (siteOwnerId) return siteOwnerId
  const currentUser = getStoredUser()
  return currentUser?.id || null
}

export const getPharmacyInbox = (): PharmacyInboxMessage[] => {
  if (typeof window === 'undefined') return []

  const currentUser = getStoredUser()
  if (currentUser?.id) {
    const ownerScoped = getItemForUser(currentUser.id, INBOX_KEY) || getScopedItem(INBOX_KEY)
    return parseMessages(ownerScoped).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }

  return parseMessages(localStorage.getItem(INBOX_KEY)).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export const addPharmacyInboxMessage = (
  payload: InboxInput,
  explicitOwnerId?: string,
): { saved: boolean; messageId: string } => {
  const ownerId = resolveOwnerId(explicitOwnerId)
  const nextMessage: PharmacyInboxMessage = {
    id: `MSG-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6)}`,
    type: payload.type,
    name: payload.name.trim(),
    contact: payload.contact.trim(),
    message: payload.message.trim(),
    createdAt: new Date().toISOString(),
    status: 'new',
    source: payload.source,
  }

  if (ownerId) {
    const existing = parseMessages(getItemForUser(ownerId, INBOX_KEY) || getScopedItem(INBOX_KEY))
    const updated = [nextMessage, ...existing]
    setItemForUser(ownerId, INBOX_KEY, JSON.stringify(updated))

    const currentUser = getStoredUser()
    if (currentUser?.id === ownerId) {
      setScopedItem(INBOX_KEY, JSON.stringify(updated))
    }

    return { saved: true, messageId: nextMessage.id }
  }

  if (typeof window !== 'undefined') {
    const existing = parseMessages(localStorage.getItem(INBOX_KEY))
    localStorage.setItem(INBOX_KEY, JSON.stringify([nextMessage, ...existing]))
  }

  return { saved: false, messageId: nextMessage.id }
}

export const updatePharmacyInboxStatus = (
  messageId: string,
  status: PharmacyInboxMessageStatus,
): void => {
  if (typeof window === 'undefined') return

  const currentUser = getStoredUser()
  if (!currentUser?.id) return

  const existing = parseMessages(getItemForUser(currentUser.id, INBOX_KEY) || getScopedItem(INBOX_KEY))
  const updated = existing.map((message) =>
    message.id === messageId ? { ...message, status } : message,
  )

  setItemForUser(currentUser.id, INBOX_KEY, JSON.stringify(updated))
  setScopedItem(INBOX_KEY, JSON.stringify(updated))
}
