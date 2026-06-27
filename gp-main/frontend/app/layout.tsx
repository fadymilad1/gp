import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AppProviders } from '@/components/providers/AppProviders'

export const metadata: Metadata = {
  title: 'Medify - Build Your Medical Website in Minutes',
  description: 'Medical website builder for Hospitals, Clinics, and Pharmacies',
  icons: {
    icon: '/mod logo.png',
    apple: '/mod logo.png',
    shortcut: '/mod logo.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body className="overflow-x-hidden" suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}

