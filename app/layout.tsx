import React from 'react'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { DynamicTheme } from '@/components/DynamicTheme'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'GymFlow - Professional Gym Management System',
  description: 'Complete gym management system with member tracking, attendance, billing, and analytics',
  keywords: 'gym management, fitness, members, billing, attendance',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground antialiased" suppressHydrationWarning>
        <DynamicTheme />
        {children}
      </body>
    </html>
  )
}
