'use client'

import { useState, useEffect } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { SettingsSidebar, SettingsSection } from '@/components/settings/settings-sidebar'
import { BrandingSettings } from '@/components/settings/BrandingSettings'
import { BranchSettings } from '@/components/settings/BranchSettings'
import { MembershipRules } from '@/components/settings/MembershipRules'
import { BillingSettings } from '@/components/settings/BillingSettings'
import { PaymentSettings } from '@/components/settings/PaymentSettings'
import { NotificationSettings } from '@/components/settings/NotificationSettings'
import { AttendanceSettings } from '@/components/settings/AttendanceSettings'
import { ClassSettings } from '@/components/settings/ClassSettings'
import { UserPermissionsSettings } from '@/components/settings/UserPermissionsSettings'
import { InventorySettings } from '@/components/settings/InventorySettings'
import { IntegrationSettings } from '@/components/settings/IntegrationSettings'
import { SystemSettings } from '@/components/settings/SystemSettings'
import { SecuritySettings } from '@/components/settings/SecuritySettings'
import { DataSettings } from '@/components/settings/DataSettings'
import { AccountSettings } from '@/components/settings/AccountSettings'
import { useGymStore } from '@/lib/store'
import { Loader2, Zap } from 'lucide-react'

export default function SettingsPage() {
  const { settings, fetchSettings, updateSettings } = useGymStore()
  const [activeSection, setActiveSection] = useState<SettingsSection>('branding')
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      await fetchSettings()
      setIsInitialLoading(false)
    }
    loadData()
  }, [fetchSettings])

  const renderSection = () => {
    if (!settings) return null

    switch (activeSection) {
      case 'branding':
        return <BrandingSettings settings={settings} onSave={updateSettings} />
      case 'branches':
        return <BranchSettings />
      case 'membership-rules':
        return <MembershipRules settings={settings} onSave={updateSettings} />
      case 'billing':
        return <BillingSettings settings={settings} onSave={updateSettings} />
      case 'payments':
        return <PaymentSettings settings={settings} onSave={updateSettings} />
      case 'notifications':
        return <NotificationSettings settings={settings} onSave={updateSettings} />
      case 'users':
        return <UserPermissionsSettings />
      case 'attendance':
        return <AttendanceSettings settings={settings} onSave={updateSettings} />
      case 'classes':
        return <ClassSettings settings={settings} onSave={updateSettings} />
      case 'inventory':
        return <InventorySettings settings={settings} onSave={updateSettings} />
      case 'integrations':
        return <IntegrationSettings />
      case 'data':
        return <DataSettings />
      case 'security':
        return <SecuritySettings />
      case 'system':
        return <SystemSettings settings={settings} onSave={updateSettings} />
      case 'account':
        return <AccountSettings />
      default:
        return (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-2xl bg-muted/20 border-muted">
            <Zap className="h-12 w-12 text-primary/20 mb-4" />
            <h3 className="text-xl font-bold text-muted-foreground capitalize">{String(activeSection).replace('-', ' ')} Settings</h3>
            <p className="text-sm text-muted-foreground mt-2">Integrating logic for this configuration module...</p>
          </div>
        )
    }
  }

  if (isInitialLoading || !settings) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-[600px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8 min-h-screen">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            System Configuration
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your gym&apos;s global preferences, branding, and operational rules
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="sticky top-24">
              <SettingsSidebar 
                activeSection={activeSection} 
                onSectionChange={setActiveSection} 
              />
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 max-w-5xl">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {renderSection()}
            </div>
          </main>
        </div>
      </div>
    </ProtectedLayout>
  )
}
