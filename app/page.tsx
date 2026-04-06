'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="text-center">
        <div className="text-6xl mb-4">💪</div>
        <p className="text-2xl font-bold text-white mb-2">GymFlow</p>
        <p className="text-gray-400">Professional Gym Management System</p>
        <p className="text-gray-500 text-sm mt-4">Loading...</p>
      </div>
    </div>
  )
}
