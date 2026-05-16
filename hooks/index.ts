'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuthStore, useGymStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

// Hook for handling async operations
export const useAsync = <T, E = string>(
  asyncFunction: () => Promise<T>,
  immediate = true,
) => {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  const [value, setValue] = useState<T | null>(null)
  const [error, setError] = useState<E | null>(null)

  const execute = useCallback(async () => {
    setStatus('pending')
    setValue(null)
    setError(null)
    try {
      const response = await asyncFunction()
      setValue(response)
      setStatus('success')
      return response
    } catch (error) {
      setError(error as E)
      setStatus('error')
    }
  }, [asyncFunction])

  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [immediate, execute])

  return { execute, status, value, error }
}

// Hook for authentication
export const useAuth = () => {
  const router = useRouter()
  const { user, isLoading, error, isAuthenticated, login, logout, checkAuth } = useAuthStore()

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      await login(email, password)
      if (useAuthStore.getState().isAuthenticated) {
        router.push('/dashboard')
      }
    },
    [login, router],
  )

  const handleLogout = useCallback(async () => {
    await logout()
    router.push('/login')
  }, [logout, router])

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    login: handleLogin,
    logout: handleLogout,
    checkAuth,
  }
}

// Hook for members
export const useMembers = () => {
  const store = useGymStore()
  return {
    members: store.members,
    isLoading: store.membersLoading,
    fetchMembers: store.fetchMembers,
    createMember: store.createMember,
    bulkCreateMembers: store.bulkCreateMembers,
    updateMember: store.updateMember,
    deleteMember: store.deleteMember,
  }
}

// Hook for attendance
export const useAttendance = () => {
  const store = useGymStore()
  return {
    attendance: store.attendance,
    isLoading: store.attendanceLoading,
    fetchAttendance: store.fetchAttendance,
    checkInMember: store.checkInMember,
    checkOutMember: store.checkOutMember,
  }
}

// Hook for invoices/billing
export const useBilling = () => {
  const store = useGymStore()
  return {
    invoices: store.invoices,
    isLoading: store.invoicesLoading,
    fetchInvoices: store.fetchInvoices,
    createInvoice: store.createInvoice,
    updateInvoice: store.updateInvoice,
    recordPayment: store.recordPayment,
  }
}

// Hook for classes
export const useClasses = () => {
  const store = useGymStore()
  return {
    classes: store.classes,
    isLoading: store.classesLoading,
    fetchClasses: store.fetchClasses,
    createClass: store.createClass,
    updateClass: store.updateClass,
    deleteClass: store.deleteClass,
  }
}

// Hook for inventory
export const useInventory = () => {
  const store = useGymStore()
  return {
    inventory: store.inventory,
    isLoading: store.inventoryLoading,
    fetchInventory: store.fetchInventory,
    addInventoryItem: store.addInventoryItem,
    updateInventoryItem: store.updateInventoryItem,
    deleteInventoryItem: store.deleteInventoryItem,
  }
}

// Hook for staff
export const useStaff = () => {
  const store = useGymStore()
  return {
    staff: store.staff,
    isLoading: store.staffLoading,
    fetchStaff: store.fetchStaff,
    addStaffMember: store.addStaffMember,
    updateStaffMember: store.updateStaffMember,
    deleteStaffMember: store.deleteStaffMember,
  }
}

// Hook for notifications
export const useNotifications = () => {
  const store = useGymStore()
  return {
    notifications: store.notifications,
    unreadCount: store.unreadCount,
    fetchNotifications: store.fetchNotifications,
    markAsRead: store.markAsRead,
  }
}

// Hook for settings
export const useSettings = () => {
  const store = useGymStore()
  return {
    settings: store.settings,
    fetchSettings: store.fetchSettings,
    updateSettings: store.updateSettings,
  }
}

// Hook for branches
export const useBranches = () => {
  const store = useGymStore()
  return {
    branches: store.branches,
    isLoading: store.branchesLoading,
    fetchBranches: store.fetchBranches,
    addBranch: store.addBranch,
    updateBranch: store.updateBranch,
    deleteBranch: store.deleteBranch,
  }
}

// Hook for plans
export const usePlans = () => {
  const store = useGymStore()
  return {
    plans: store.plans,
    isLoading: store.plansLoading,
    fetchPlans: store.fetchPlans,
    createPlan: store.createPlan,
    updatePlan: store.updatePlan,
    deletePlan: store.deletePlan,
  }
}

// Hook for activity logs
export const useActivityLogs = () => {
  const store = useGymStore()
  return {
    activityLogs: store.activityLogs,
    isLoading: store.activityLogsLoading,
    fetchActivityLogs: store.fetchActivityLogs,
    logActivity: store.logActivity,
  }
}

// Hook for handling form submissions
export const useFormSubmit = <T,>(
  onSubmit: (data: T) => Promise<void>,
) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(
    async (data: T) => {
      setIsLoading(true)
      setError(null)
      try {
        await onSubmit(data)
      } catch (err: any) {
        setError(err.message || 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    },
    [onSubmit],
  )

  return { handleSubmit, isLoading, error }
}

// Hook for debounced search
export const useDebouncedSearch = <T,>(
  items: T[],
  searchKey: keyof T,
  delay = 300,
) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<T[]>(items)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim() === '') {
        setResults(items)
      } else {
        const filtered = items.filter((item) =>
          String(item[searchKey] || '').toLowerCase().includes(searchTerm.toLowerCase()),
        )
        setResults(filtered)
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [items, searchTerm, searchKey, delay])

  return { searchTerm, setSearchTerm, results }
}

// Hook for handling pagination
export const usePagination = <T,>(items: T[], itemsPerPage = 10) => {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(items.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = items.slice(startIndex, endIndex)

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages))
  }, [totalPages])

  const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage])
  const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage])

  return {
    currentPage,
    totalPages,
    currentItems,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  }
}

// Hook for local storage
export const useLocalStorage = <T,>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(initialValue)

  // Get value from local storage
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (item) {
        setStoredValue(JSON.parse(item))
      }
    } catch (error) {
      console.error('Error reading from local storage:', error)
    }
  }, [key])

  // Set value in local storage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error('Error writing to local storage:', error)
    }
  }

  return [storedValue, setValue] as const
}
