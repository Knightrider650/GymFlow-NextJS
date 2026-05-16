'use client'

import { useEffect } from 'react'
import { useGymStore } from '@/lib/store'

export function DynamicTheme() {
  const settings = useGymStore((state) => state.settings)

  useEffect(() => {
    if (!settings) return

    const applyTheme = () => {
      const root = document.documentElement
      
      if (settings.primaryColor) {
        const hsl = hexToHSL(settings.primaryColor)
        if (hsl) {
          root.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`)
        }
      }

      if (settings.secondaryColor) {
        const hsl = hexToHSL(settings.secondaryColor)
        if (hsl) {
          root.style.setProperty('--secondary', `${hsl.h} ${hsl.s}% ${hsl.l}%`)
        }
      }

      // Handle dark/light mode preference from settings
      if (settings.system?.theme) {
        if (settings.system.theme === 'dark') {
          root.classList.add('dark')
        } else if (settings.system.theme === 'light') {
          root.classList.remove('dark')
        } else {
          // Auto - follow system
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          if (isDark) root.classList.add('dark')
          else root.classList.remove('dark')
        }
      }
    }

    applyTheme()
  }, [settings])

  return null
}

function hexToHSL(hex: string) {
  // Remove # if present
  hex = hex.replace(/^#/, '')

  // Parse RGB
  let r = 0, g = 0, b = 0
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16)
    g = parseInt(hex[1] + hex[1], 16)
    b = parseInt(hex[2] + hex[2], 16)
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16)
    g = parseInt(hex.substring(2, 4), 16)
    b = parseInt(hex.substring(4, 6), 16)
  } else {
    return null
  }

  // Convert to [0, 1]
  r /= 255; g /= 255; b /= 255

  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}
