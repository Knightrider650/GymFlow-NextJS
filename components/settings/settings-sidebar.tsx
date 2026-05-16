import React from 'react'
import { cn } from '@/lib/utils'
import { 
  Building2, Image, ShieldCheck, MapPin, CreditCard, 
  BellRing, Users, UserCheck, CalendarDays, Package, 
  Globe, Share2, Activity, Settings2, Shield
} from 'lucide-react'

export type SettingsSection = 
  | 'branding' 
  | 'branches' 
  | 'membership-rules' 
  | 'billing' 
  | 'payments' 
  | 'notifications' 
  | 'users' 
  | 'attendance' 
  | 'classes' 
  | 'inventory' 
  | 'integrations' 
  | 'data' 
  | 'security' 
  | 'system' 
  | 'account'

interface SettingsSidebarProps {
  activeSection: SettingsSection
  onSectionChange: (section: SettingsSection) => void
}

const sections: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
  { id: 'branding', label: 'Gym Profile & Branding', icon: Building2 },
  { id: 'branches', label: 'Branches & Locations', icon: MapPin },
  { id: 'membership-rules', label: 'Membership & Plans', icon: UserCheck },
  { id: 'billing', label: 'Billing & Invoices', icon: CreditCard },
  { id: 'payments', label: 'Payments & POS', icon: Share2 },
  { id: 'notifications', label: 'Notifications & Alerts', icon: BellRing },
  { id: 'users', label: 'Users & Permissions', icon: Users },
  { id: 'attendance', label: 'Attendance & Access', icon: Activity },
  { id: 'classes', label: 'Classes & Booking', icon: CalendarDays },
  { id: 'inventory', label: 'Inventory & Stock', icon: Package },
  { id: 'integrations', label: 'Integrations', icon: Globe },
  { id: 'data', label: 'Data, Export & Backup', icon: ShieldCheck },
  { id: 'security', label: 'Security & Audit', icon: Shield },
  { id: 'system', label: 'System & UI', icon: Settings2 },
  { id: 'account', label: 'Account & Subscription', icon: Image },
]

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <nav className="flex flex-col gap-1 w-full lg:w-64">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => onSectionChange(section.id)}
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
            activeSection === section.id
              ? "bg-primary text-primary-foreground shadow-md scale-105"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <section.icon className={cn("h-4 w-4", activeSection === section.id ? "text-white" : "text-primary/70")} />
          {section.label}
        </button>
      ))}
    </nav>
  )
}
