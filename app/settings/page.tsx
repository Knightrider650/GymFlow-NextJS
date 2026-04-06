'use client'

import { useEffect, useState } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSettings } from '@/hooks'
import { Save } from 'lucide-react'

export default function SettingsPage() {
  const { settings, fetchSettings, updateSettings } = useSettings()
  const [formData, setFormData] = useState({
    gymName: '',
    gymLogo: '',
    gymEmail: '',
    gymPhone: '',
    gymAddress: '',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    invoicePrefix: 'INV',
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    if (settings) {
      setFormData({
        gymName: settings.gymName || '',
        gymLogo: settings.gymLogo || '',
        gymEmail: settings.gymEmail || '',
        gymPhone: settings.gymPhone || '',
        gymAddress: settings.gymAddress || '',
        currency: settings.currency || 'USD',
        dateFormat: settings.dateFormat || 'MM/DD/YYYY',
        invoicePrefix: settings.invoicePrefix || 'INV',
      })
    }
  }, [settings])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateSettings(formData)
  }

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your gym's information and preferences
          </p>
        </div>

        {/* Gym Information */}
        <Card>
          <CardHeader>
            <CardTitle>Gym Information</CardTitle>
            <CardDescription>
              Basic details about your gym
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gymName">Gym Name</Label>
                  <Input
                    id="gymName"
                    name="gymName"
                    value={formData.gymName}
                    onChange={handleInputChange}
                    placeholder="Your Gym Name"
                  />
                </div>

                <div>
                  <Label htmlFor="gymLogo">Gym Logo / Profile Pic (Upload)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    {formData.gymLogo && (
                      <img src={formData.gymLogo} alt="Logo" className="w-10 h-10 rounded-lg object-cover" />
                    )}
                    <Input
                      id="gymLogo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            setFormData(prev => ({ ...prev, gymLogo: reader.result as string }))
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      className="cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="gymEmail">Gym Email</Label>
                  <Input
                    id="gymEmail"
                    name="gymEmail"
                    type="email"
                    value={formData.gymEmail}
                    onChange={handleInputChange}
                    placeholder="admin@gym.com"
                  />
                </div>

                <div>
                  <Label htmlFor="gymPhone">Gym Phone</Label>
                  <Input
                    id="gymPhone"
                    name="gymPhone"
                    value={formData.gymPhone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div>
                  <Label htmlFor="gymAddress">Gym Address</Label>
                  <Input
                    id="gymAddress"
                    name="gymAddress"
                    value={formData.gymAddress}
                    onChange={handleInputChange}
                    placeholder="123 Main St, City, State 12345"
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-4">System Preferences</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <select
                      id="currency"
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      className="w-full h-10 px-3 rounded-md border border-input text-sm"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="AUD">AUD (A$)</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <select
                      id="dateFormat"
                      name="dateFormat"
                      value={formData.dateFormat}
                      onChange={handleInputChange}
                      className="w-full h-10 px-3 rounded-md border border-input text-sm"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                    <Input
                      id="invoicePrefix"
                      name="invoicePrefix"
                      value={formData.invoicePrefix}
                      onChange={handleInputChange}
                      placeholder="INV"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="submit" className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Settings
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>
              Advanced settings for API integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="font-semibold">API Endpoint</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {process.env.NEXT_PUBLIC_API_URL}
                </p>
              </div>
              <div>
                <Label className="font-semibold">WebSocket Endpoint</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {process.env.NEXT_PUBLIC_WS_URL}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>About GymFlow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Version:</strong> 2.0.0</p>
              <p><strong>Built with:</strong> Next.js + React + Tailwind CSS + shadcn/ui</p>
              <p><strong>Backend:</strong> Node.js + Express.js + PostgreSQL</p>
              <p className="text-muted-foreground mt-4">
                GymFlow is a professional gym management system designed to streamline all operations
                for gym businesses including member management, billing, attendance tracking, and more.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
}
