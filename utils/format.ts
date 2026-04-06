import { format, parse } from 'date-fns'

export const formatDate = (date: string | Date, formatStr = 'MMM dd, yyyy') => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, formatStr)
  } catch (error) {
    return 'Invalid date'
  }
}

export const formatTime = (date: string | Date, formatStr = 'HH:mm') => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, formatStr)
  } catch (error) {
    return 'Invalid time'
  }
}

export const formatDateTime = (date: string | Date, formatStr = 'MMM dd, yyyy HH:mm') => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, formatStr)
  } catch (error) {
    return 'Invalid date/time'
  }
}

export const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export const formatPercentage = (value: number, decimals = 2) => {
  return `${(value * 100).toFixed(decimals)}%`
}

export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

export const calculateDuration = (startTime: string, endTime: string) => {
  try {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMs = end.getTime() - start.getTime()
    return Math.round(diffMs / (1000 * 60)) // return in minutes
  } catch (error) {
    return 0
  }
}

export const isExpired = (date: string | Date) => {
  const expiryDate = typeof date === 'string' ? new Date(date) : date
  return expiryDate < new Date()
}

export const daysUntilExpiry = (date: string | Date) => {
  const expiryDate = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  const diffTime = expiryDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export const isLowStock = (quantity: number, minThreshold: number) => {
  return quantity <= minThreshold
}

export const truncate = (text: string, length = 50) => {
  if (text.length > length) {
    return text.substring(0, length) + '...'
  }
  return text
}

export const capitalizeFirst = (text: string) => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

export const capitalizeWords = (text: string) => {
  return text.split(' ').map(capitalizeFirst).join(' ')
}

export const slugify = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePhone = (phone: string) => {
  const phoneRegex = /^[0-9\-\+\s\(\)]{7,}$/
  return phoneRegex.test(phone)
}

export const generateInvoiceNumber = (prefix = 'INV', number: number) => {
  return `${prefix}-${String(number).padStart(6, '0')}`
}

export const getStatusBadgeColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'active':
    case 'paid':
      return 'bg-green-100 text-green-800'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'expired':
    case 'overdue':
    case 'inactive':
      return 'bg-red-100 text-red-800'
    case 'partial':
      return 'bg-orange-100 text-orange-800'
    case 'cancelled':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-blue-100 text-blue-800'
  }
}

export const getMembershipColor = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'basic':
      return 'bg-blue-100 text-blue-800'
    case 'premium':
      return 'bg-purple-100 text-purple-800'
    case 'elite':
      return 'bg-amber-100 text-amber-800'
    case 'trial':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export const getInventoryCategoryIcon = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'equipment':
      return '🏋️'
    case 'consumables':
      return '🥤'
    case 'services':
      return '💼'
    case 'merchandise':
      return '🎽'
    default:
      return '📦'
  }
}

export const debounce = (func: Function, delay = 300) => {
  let timeoutId: NodeJS.Timeout
  return (...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

export const throttle = (func: Function, limit = 300) => {
  let inThrottle: boolean
  return (...args: any[]) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
