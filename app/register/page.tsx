'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/lib/store'

export default function RegisterPage() {
  const router = useRouter()
  const login = useAuthStore(state => state.login);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [formError, setFormError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formData.email || !formData.password || !formData.name) {
      setFormError('Please fill in all fields')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      const response = await apiClient.post('/api/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password
      })

      if (response.success) {
        // Automatically sign them in
        await login(formData.email, formData.password)
        router.push('/dashboard')
      } else {
        setFormError(response.error || 'Registration failed')
      }
    } catch (err: any) {
      setFormError(err.message || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 text-4xl font-bold text-primary">💪</div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription className="text-base">
            Join GymFlow Pro Edition
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm font-medium animate-in fade-in slide-in-from-top-1">
                {formError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" autoComplete="name" placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} disabled={isLoading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" autoComplete="email" type="email" placeholder="john@example.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} disabled={isLoading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" autoComplete="new-password" type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} disabled={isLoading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" name="confirmPassword" autoComplete="new-password" type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} disabled={isLoading} />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading} size="lg">
              {isLoading ? 'Registering...' : 'Sign Up'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account? <Link href="/login" className="text-primary hover:underline">Log In</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
