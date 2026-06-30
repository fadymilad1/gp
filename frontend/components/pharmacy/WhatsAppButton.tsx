'use client'

import React from 'react'
import { FaWhatsapp } from 'react-icons/fa'

interface WhatsAppButtonProps {
  phone?: string
  defaultMessage?: string
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  phone,
  defaultMessage = 'Hello, I have a question about your pharmacy products.',
}) => {
  if (!phone) return null

  // Clean non-numeric characters for WhatsApp link compatibility
  const cleanPhone = phone.replace(/[^0-9]/g, '')
  if (!cleanPhone) return null

  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultMessage)}`

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-[92px] right-6 w-16 h-16 bg-[#25D366] hover:bg-[#20BA56] rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform z-50 group"
      aria-label="Chat on WhatsApp"
    >
      <FaWhatsapp size={32} />
      <span className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-neutral-dark text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        Chat on WhatsApp
      </span>
    </a>
  )
}
