import React from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AppSettings } from '@/types'
import { 
  Save, Building2, Globe, Paintbrush, LayoutGrid, FileText, 
  Upload, Instagram, Facebook, Twitter, Smartphone, Mail, Phone, ShieldCheck 
} from 'lucide-react'

interface BrandingSettingsProps {
  settings: AppSettings
  onSave: (data: Partial<AppSettings>) => void
}

export function BrandingSettings({ settings, onSave }: BrandingSettingsProps) {
  const [formData, setFormData] = React.useState<Partial<AppSettings>>({})
  const [isSaving, setIsSaving] = React.useState(false)
  const logoInputRef = React.useRef<HTMLInputElement>(null)
  const faviconInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (settings) {
      setFormData(settings)
    }
  }, [settings])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'gymLogo' | 'favicon') => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit file size to 2MB to keep Base64 strings reasonable
    if (file.size > 2 * 1024 * 1024) {
      alert("File is too large! Please choose an image smaller than 2MB.")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setFormData(prev => ({ ...prev, [fieldName]: base64String }))
    }
    reader.readAsDataURL(file)
  }

  const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [name]: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await onSave(formData)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  // Pre-set dashboard background choices for premium look
  const backgroundPresets = [
    { id: 'none', name: 'Clean / None', value: '' },
    { id: 'dots', name: 'Modern Dot Grid', value: 'radial-gradient(#222b3c 1px, transparent 1px)' },
    { id: 'glow', name: 'Vibrant Mesh Glow', value: 'radial-gradient(circle at 50% 50%, #1e293b, #0f172a)' },
    { id: 'stripe', name: 'Tech Diagonal Stripes', value: 'linear-gradient(45deg, #111827 25%, #1f2937 25%)' }
  ]

  const handlePresetSelect = (value: string) => {
    setFormData(prev => ({ ...prev, dashboardBackground: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Gym Identity Card */}
      <Card className="border-none shadow-xl bg-card/40 backdrop-blur-md overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Gym Identity</CardTitle>
              <CardDescription>Configure your gym&apos;s basic profile and legal information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="gymName" className="font-semibold text-slate-700 dark:text-slate-300">Gym Display Name *</Label>
              <Input 
                id="gymName" 
                name="gymName" 
                value={formData.gymName || ''} 
                onChange={handleChange} 
                required 
                className="bg-background/50 focus:ring-primary/20"
                placeholder="e.g. GymFlow HQ"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalName" className="font-semibold text-slate-700 dark:text-slate-300">Legal Business Name</Label>
              <Input 
                id="legalName" 
                name="legalName" 
                value={formData.legalName || ''} 
                onChange={handleChange}
                className="bg-background/50 focus:ring-primary/20"
                placeholder="e.g. GymFlow International LLC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gymEmail" className="font-semibold text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" /> Primary Contact Email *
              </Label>
              <Input 
                id="gymEmail" 
                name="gymEmail" 
                type="email" 
                value={formData.gymEmail || ''} 
                onChange={handleChange} 
                required
                className="bg-background/50 focus:ring-primary/20"
                placeholder="contact@yourgym.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail" className="font-semibold text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-indigo-500" /> Support Desk Email
              </Label>
              <Input 
                id="supportEmail" 
                name="supportEmail" 
                type="email" 
                value={formData.supportEmail || ''} 
                onChange={handleChange}
                className="bg-background/50 focus:ring-primary/20"
                placeholder="support@yourgym.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gymPhone" className="font-semibold text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-primary" /> Primary Phone *
              </Label>
              <Input 
                id="gymPhone" 
                name="gymPhone" 
                value={formData.gymPhone || ''} 
                onChange={handleChange} 
                required
                className="bg-background/50 focus:ring-primary/20"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryPhone" className="font-semibold text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-indigo-500" /> Secondary Phone
              </Label>
              <Input 
                id="secondaryPhone" 
                name="secondaryPhone" 
                value={formData.secondaryPhone || ''} 
                onChange={handleChange}
                className="bg-background/50 focus:ring-primary/20"
                placeholder="+1 (555) 765-4321"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="gymAddress" className="font-semibold text-slate-700 dark:text-slate-300">Gym Address (Full Location details) *</Label>
              <Input 
                id="gymAddress" 
                name="gymAddress" 
                value={formData.gymAddress || ''} 
                onChange={handleChange} 
                required
                className="bg-background/50 focus:ring-primary/20"
                placeholder="Suite 100, 123 Fitness Ave, New York, NY 10001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId" className="font-semibold text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Tax ID / Regional GST Identification
              </Label>
              <Input 
                id="taxId" 
                name="taxId" 
                value={formData.taxId || ''} 
                onChange={handleChange}
                className="bg-background/50 focus:ring-primary/20"
                placeholder="e.g. GSTIN12345678"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branding & Theme Customizer */}
      <Card className="border-none shadow-xl bg-card/40 backdrop-blur-md overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Paintbrush className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Branding & Theme</CardTitle>
              <CardDescription>Define your brand logo, theme mode, and highlight accents</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Logo and Favicon uploaders */}
            <div className="space-y-6 lg:border-r border-slate-100 dark:border-slate-800 lg:pr-8">
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Gym Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/20 flex items-center justify-center bg-slate-50 dark:bg-slate-900/60 relative overflow-hidden group shrink-0">
                    {formData.gymLogo ? (
                      <Image src={formData.gymLogo} alt="Gym Logo" fill className="object-contain p-2" unoptimized />
                    ) : (
                      <Building2 className="h-6 w-6 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Input 
                        name="gymLogo" 
                        value={formData.gymLogo || ''} 
                        onChange={handleChange} 
                        placeholder="Paste image link or upload..."
                        className="text-xs h-9 bg-background/50 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1 text-xs shrink-0 cursor-pointer"
                        onClick={() => logoInputRef.current?.click()}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Upload
                      </Button>
                      <input 
                        type="file" 
                        ref={logoInputRef}
                        accept="image/*"
                        className="hidden" 
                        onChange={(e) => handleFileChange(e, 'gymLogo')}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Upload from device or paste web link</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Favicon</Label>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg border border-muted-foreground/20 flex items-center justify-center bg-slate-50 dark:bg-slate-900/60 relative overflow-hidden shrink-0">
                    {formData.favicon ? (
                      <Image src={formData.favicon} alt="Favicon" width={32} height={32} className="w-8 h-8 object-contain" unoptimized />
                    ) : (
                      <Globe className="h-5 w-5 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Input 
                        name="favicon" 
                        value={formData.favicon || ''} 
                        onChange={handleChange} 
                        placeholder="Paste favicon link or upload..."
                        className="text-xs h-9 bg-background/50 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1 text-xs shrink-0 cursor-pointer"
                        onClick={() => faviconInputRef.current?.click()}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Upload
                      </Button>
                      <input 
                        type="file" 
                        ref={faviconInputRef}
                        accept="image/*"
                        className="hidden" 
                        onChange={(e) => handleFileChange(e, 'favicon')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Colors and Themes */}
            <div className="space-y-6 lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300">Primary Brand Accent</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color" 
                      name="primaryColor" 
                      value={formData.primaryColor || '#3b82f6'} 
                      className="w-12 p-1 h-10 shrink-0 bg-background/50 border cursor-pointer rounded-lg" 
                      onChange={handleChange} 
                    />
                    <Input 
                      type="text" 
                      value={formData.primaryColor || '#3b82f6'} 
                      className="flex-1 bg-background/50 font-mono text-sm" 
                      readOnly 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300">Secondary Accent</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color" 
                      name="secondaryColor" 
                      value={formData.secondaryColor || '#64748b'} 
                      className="w-12 p-1 h-10 shrink-0 bg-background/50 border cursor-pointer rounded-lg" 
                      onChange={handleChange} 
                    />
                    <Input 
                      type="text" 
                      value={formData.secondaryColor || '#64748b'} 
                      className="flex-1 bg-background/50 font-mono text-sm" 
                      readOnly 
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="themeMode" className="font-semibold text-slate-700 dark:text-slate-300">Theme Mode Selection</Label>
                  <select
                    id="themeMode"
                    name="themeMode"
                    aria-label="Theme mode"
                    value={formData.themeMode || 'dark'}
                    onChange={handleChange}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background/50 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                    <option value="auto">Auto (Match System Preferences)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300">Dashboard Background Pattern</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {backgroundPresets.map(preset => (
                      <Button
                        key={preset.id}
                        type="button"
                        variant={formData.dashboardBackground === preset.value ? 'default' : 'outline'}
                        onClick={() => handlePresetSelect(preset.value)}
                        className="text-xs h-9 justify-start font-medium truncate"
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Public Social Links & Invoice Footer Information */}
      <Card className="border-none shadow-xl bg-card/40 backdrop-blur-md overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Public & Document Info</CardTitle>
              <CardDescription>Setup external website links and invoice footer parameters</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="websiteUrl" className="font-semibold text-slate-700 dark:text-slate-300">Official Website URL</Label>
              <Input 
                id="websiteUrl" 
                name="websiteUrl" 
                value={formData.websiteUrl || ''} 
                onChange={handleChange}
                className="bg-background/50 focus:ring-primary/20"
                placeholder="https://yourgym.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram" className="font-semibold text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                <Instagram className="h-3.5 w-3.5 text-pink-500" /> Instagram Handle
              </Label>
              <Input 
                id="instagram" 
                name="instagram" 
                value={formData.socialLinks?.instagram || ''} 
                onChange={handleSocialChange}
                className="bg-background/50 focus:ring-primary/20"
                placeholder="instagram.com/gymhandle"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebook" className="font-semibold text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                <Facebook className="h-3.5 w-3.5 text-blue-600" /> Facebook Page
              </Label>
              <Input 
                id="facebook" 
                name="facebook" 
                value={formData.socialLinks?.facebook || ''} 
                onChange={handleSocialChange}
                className="bg-background/50 focus:ring-primary/20"
                placeholder="facebook.com/gympage"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitter" className="font-semibold text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                <Twitter className="h-3.5 w-3.5 text-sky-400" /> Twitter / X Profile
              </Label>
              <Input 
                id="twitter" 
                name="twitter" 
                value={formData.socialLinks?.twitter || ''} 
                onChange={handleSocialChange}
                className="bg-background/50 focus:ring-primary/20"
                placeholder="twitter.com/gymprofile"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="invoiceFooterText" className="font-semibold text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" /> Invoice/Receipt Custom Footer Text
              </Label>
              <textarea
                id="invoiceFooterText"
                name="invoiceFooterText"
                value={formData.invoiceFooterText || ''}
                onChange={handleChange}
                rows={3}
                className="w-full p-3 rounded-md border border-input bg-background/50 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="Enter disclaimers, refund terms, payment policy text, or custom message to appear at the bottom of customer receipts."
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button 
              type="submit" 
              className="gap-2 px-6 h-11 font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                  Saving preferences...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Identity & Branding
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
