import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { User, Member, Attendance, Invoice, FitnessClass, InventoryItem, Staff, Notification, AppSettings, Branch } from '../types'
import { apiClient } from './api-client'

let authCheckPromise: Promise<void> | null = null

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  switchGym: (gymId: string) => Promise<boolean>
}

interface GymState {
  // Members
  members: Member[]
  membersLoading: boolean
  fetchMembers: (filters?: import('../types').MemberFilters, force?: boolean) => Promise<void>
  createMember: (member: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  bulkCreateMembers: (members: any[]) => Promise<any>
  updateMember: (id: string, member: Partial<Member>) => Promise<void>
  deleteMember: (id: string) => Promise<void>
  sendMessageToMembers: (payload: { memberIds: string[], channel: string, subject?: string, message: string }) => Promise<{ success: boolean; message?: string; error?: string }>

  // Attendance
  attendance: Attendance[]
  attendanceLoading: boolean
  fetchAttendance: (filters?: import('../types').AttendanceFilters, force?: boolean) => Promise<void>
  checkInMember: (memberId: string, notes?: string) => Promise<void>
  checkOutMember: (attendanceId: string) => Promise<void>

  // Invoices
  invoices: Invoice[]
  invoicesLoading: boolean
  fetchInvoices: (filters?: import('../types').BillingFilters, force?: boolean) => Promise<void>
  createInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateInvoice: (id: string, invoice: Partial<Invoice>) => Promise<void>
  recordPayment: (invoiceId: string, amount: number, method: string) => Promise<void>

  // Classes
  classes: FitnessClass[]
  classesLoading: boolean
  fetchClasses: (force?: boolean) => Promise<void>
  createClass: (classData: Omit<FitnessClass, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateClass: (id: string, classData: Partial<FitnessClass>) => Promise<void>
  deleteClass: (id: string) => Promise<void>

  // Inventory
  inventory: InventoryItem[]
  inventoryLoading: boolean
  fetchInventory: (filters?: import('../types').InventoryFilters, force?: boolean) => Promise<void>
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'lastUpdated'>) => Promise<void>
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => Promise<void>
  deleteInventoryItem: (id: string) => Promise<void>

  // Staff
  staff: Staff[]
  staffLoading: boolean
  fetchStaff: () => Promise<void>
  addStaffMember: (staffData: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateStaffMember: (id: string, staffData: Partial<Staff>) => Promise<void>
  deleteStaffMember: (id: string) => Promise<void>

  // Notifications
  notifications: Notification[]
  unreadCount: number
  fetchNotifications: () => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>

  // Settings
  settings: AppSettings | null
  fetchSettings: () => Promise<void>
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>

  // Dashboard Optimized Stats
  stats: any | null
  statsLoading: boolean
  fetchStats: (force?: boolean) => Promise<void>

  // Data Loaded Flags
  membersLoaded: boolean
  attendanceLoaded: boolean
  invoicesLoaded: boolean
  classesLoaded: boolean
  inventoryLoaded: boolean
  staffLoaded: boolean
  leadsLoaded: boolean
  plansLoaded: boolean
  expensesLoaded: boolean

  // Global UI State
  error: string | null
  setError: (error: string | null) => void

  // CRM Leads
  leads: any[]
  leadsLoading: boolean
  fetchLeads: (force?: boolean) => Promise<void>
  createLead: (lead: any) => Promise<void>
  updateLead: (id: string, lead: any) => Promise<void>
  deleteLead: (id: string) => Promise<void>
  convertLead: (id: string, memberData: any) => Promise<void>

  // Branches
  branches: import('../types').Branch[]
  branchesLoading: boolean
  fetchBranches: () => Promise<void>
  addBranch: (branchData: Omit<import('../types').Branch, 'id'>) => Promise<void>
  updateBranch: (id: string, branchData: Partial<import('../types').Branch>) => Promise<void>
  deleteBranch: (id: string) => Promise<void>

  // Membership Plans
  plans: any[]
  plansLoading: boolean
  fetchPlans: (force?: boolean) => Promise<void>
  createPlan: (plan: any) => Promise<void>
  updatePlan: (id: string, plan: any) => Promise<void>
  deletePlan: (id: string) => Promise<void>

  // Expenses
  expenses: any[]
  expensesLoading: boolean
  fetchExpenses: (force?: boolean) => Promise<void>
  createExpense: (expense: any) => Promise<void>
  updateExpense: (id: string, expense: any) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  // Activity Logs
  activityLogs: any[]
  activityLogsLoading: boolean
  fetchActivityLogs: (filters?: any) => Promise<any[]>
  logActivity: (action: string, entityType: string, entityId?: string, entityName?: string, details?: string) => Promise<void>
  // Real-time
  scanErrors: any[]
  addScanError: (error: any) => void
  clearScanErrors: () => void
  initStream: () => () => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isLoading: false,
        error: null,
        isAuthenticated: false,

        login: async (email: string, password: string) => {
          set({ isLoading: true, error: null })
          try {
            const response = await apiClient.post('/api/auth/login', { email, password })
            if (response.success && response.data) {
              const { user, accessToken, refreshToken } = response.data
              localStorage.setItem('accessToken', accessToken)
              document.cookie = `token=${accessToken}; path=/; max-age=86400; SameSite=Lax`
              if (refreshToken) {
                localStorage.setItem('refreshToken', refreshToken)
              }
              set({ user, isAuthenticated: true })
            } else {
              set({ error: response.error || 'Login failed' })
            }
          } catch (error: any) {
            set({ error: error.message })
          } finally {
            set({ isLoading: false })
          }
        },

        logout: async () => {
          try {
            await apiClient.post('/api/auth/logout')
          } catch (error) {
            console.error('Logout error:', error)
          } finally {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('auth-storage')
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
            set({ user: null, isAuthenticated: false })
          }
        },



        checkAuth: async () => {
          if (authCheckPromise) {
            return authCheckPromise
          }

          authCheckPromise = (async () => {
            set({ isLoading: true })
            try {
              const hasAccessToken = typeof window !== 'undefined' && !!localStorage.getItem('accessToken')
              const hasRefreshToken = typeof window !== 'undefined' && !!localStorage.getItem('refreshToken')
              
              const getCookie = (name: string) => {
                if (typeof document === 'undefined') return null
                const value = `; ${document.cookie}`
                const parts = value.split(`; ${name}=`)
                if (parts.length === 2) return parts.pop()?.split(';').shift() || null
                return null
              }
              const hasCookieToken = typeof document !== 'undefined' && !!getCookie('token')

              if (!hasAccessToken && !hasRefreshToken && !hasCookieToken) {
                set({ user: null, isAuthenticated: false })
                return
              }

              const response = await apiClient.get('/api/auth/me')
              if (response.success && response.data) {
                set({ user: response.data, isAuthenticated: true })
              } else {
                localStorage.removeItem('accessToken')
                localStorage.removeItem('refreshToken')
                localStorage.removeItem('auth-storage')
                document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
                set({ user: null, isAuthenticated: false })
              }
            } catch (error) {
              localStorage.removeItem('accessToken')
              localStorage.removeItem('refreshToken')
              localStorage.removeItem('auth-storage')
              document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
              set({ user: null, isAuthenticated: false })
            } finally {
              set({ isLoading: false })
              authCheckPromise = null
            }
          })()

          return authCheckPromise
        },
        switchGym: async (gymId: string) => {
          set({ isLoading: true, error: null })
          try {
            const response = await apiClient.post('/api/auth/switch-gym', { gymId })
            if (response.success && response.data) {
              const { accessToken, refreshToken } = response.data
              localStorage.setItem('accessToken', accessToken)
              document.cookie = `token=${accessToken}; path=/; max-age=86400; SameSite=Lax`
              if (refreshToken) {
                localStorage.setItem('refreshToken', refreshToken)
              }
              // After switching tokens, we need to refresh the user data from /api/auth/me
              const meRes = await apiClient.get('/api/auth/me')
              if (meRes.success && meRes.data) {
                set({ user: meRes.data, isAuthenticated: true })
                return true
              }
            }
            set({ error: response.error || 'Failed to switch gym' })
            return false
          } catch (error: any) {
            set({ error: error.message })
            return false
          } finally {
            set({ isLoading: false })
          }
        },
      }),
      {
        name: 'auth-storage',
      },
    ),
  ),
)

export const useGymStore = create<GymState>()((set, get) => ({
  error: null,
  setError: (error: string | null) => set({ error }),

  // Scan Errors
  scanErrors: [],
  addScanError: (error: any) => set((state) => ({
    scanErrors: [error, ...state.scanErrors].slice(0, 10)
  })),
  clearScanErrors: () => set({ scanErrors: [] }),

  membersLoaded: false,
  attendanceLoaded: false,
  invoicesLoaded: false,
  classesLoaded: false,
  inventoryLoaded: false,
  staffLoaded: false,
  leadsLoaded: false,
  plansLoaded: false,
  expensesLoaded: false,
  stats: null,
  statsLoading: false,

  // Members
  members: [],
  membersLoading: false,

  // Expenses
  expenses: [],
  expensesLoading: false,
  fetchMembers: async (filters?: import('../types').MemberFilters, force = false) => {
    if (get().membersLoaded && !force && !filters) return
    set({ membersLoading: true })
    try {
      const response = await apiClient.get('/api/members', { params: filters })
      if (response.success) {
        set({ members: response.data || [], membersLoaded: true })
      }
    } catch (error) {
      console.error('Error fetching members:', error)
      set({ error: 'Failed to fetch members' })
    } finally {
      set({ membersLoading: false })
    }
  },

  createMember: async (member: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await apiClient.post('/api/members', member)
      if (response.success) {
        await get().fetchMembers(undefined, true)
      } else {
        throw new Error(response.error || 'Failed to create member')
      }
    } catch (error: any) {
      console.error('Error creating member:', error)
      set({ error: error.message || 'Failed to create member' })
      throw error
    }
  },

  bulkCreateMembers: async (members: any[]) => {
    try {
      const response = await apiClient.post('/api/members/bulk', { members })
      if (response.success) {
        await get().fetchMembers(undefined, true)
      } else {
        throw new Error(response.error || 'Failed to bulk create members')
      }
      return response
    } catch (error: any) {
      console.error('Error bulk creating members:', error)
      set({ error: error.message || 'Failed to bulk create members' })
      throw error
    }
  },

  updateMember: async (id: string, member: Partial<Member>) => {
    try {
      const response = await apiClient.put(`/api/members/${id}`, member)
      if (response.success) {
        await get().fetchMembers(undefined, true)
      } else {
        throw new Error(response.error || 'Failed to update member')
      }
    } catch (error: any) {
      console.error('Error updating member:', error)
      set({ error: error.message || 'Failed to update member' })
      throw error
    }
  },

  deleteMember: async (id: string) => {
    try {
      const response = await apiClient.delete(`/api/members/${id}`)
      if (response.success) {
        await get().fetchMembers(undefined, true)
      } else {
        throw new Error(response.error || 'Failed to delete member')
      }
    } catch (error: any) {
      console.error('Error deleting member:', error)
      set({ error: error.message || 'Failed to delete member' })
      throw error
    }
  },

  sendMessageToMembers: async (payload: { memberIds: string[]; channel: string; subject?: string; message: string }) => {
    try {
      const response = await apiClient.post('/api/members/message', payload)
      return {
        success: response.success,
        message: response.message || (response as any).data?.message,
        error: response.error,
      }
    } catch (error: any) {
      console.error('Error sending messages to members:', error)
      return { success: false, error: error.message || 'Failed to dispatch messages' }
    }
  },

  // Attendance
  attendance: [],
  attendanceLoading: false,
  fetchAttendance: async (filters?: import('../types').AttendanceFilters, force = false) => {
    if (get().attendanceLoaded && !force && !filters) return
    set({ attendanceLoading: true })
    try {
      const response = await apiClient.get('/api/attendance', { params: filters })
      if (response.success) {
        set({ attendance: response.data || [], attendanceLoaded: true })
      }
    } catch (error) {
      console.error('Error fetching attendance:', error)
    } finally {
      set({ attendanceLoading: false })
    }
  },

  checkInMember: async (memberId: string, notes?: string) => {
    try {
      const response = await apiClient.post('/api/attendance/checkin', { memberId, notes })
      if (response.success) {
        await get().fetchAttendance(undefined, true)
        await get().fetchStats(true)
      } else {
        throw new Error(response.error || 'Failed to check in member')
      }
    } catch (error: any) {
      console.error('Error checking in member:', error)
      set({ error: error.message || 'Failed to check in member' })
      throw error
    }
  },

  checkOutMember: async (attendanceId: string) => {
    try {
      const response = await apiClient.post(`/api/attendance/${attendanceId}/checkout`)
      if (response.success) {
        await get().fetchAttendance(undefined, true)
        await get().fetchStats(true)
      } else {
        throw new Error(response.error || 'Failed to check out member')
      }
    } catch (error: any) {
      console.error('Error checking out member:', error)
      set({ error: error.message || 'Failed to check out member' })
      throw error
    }
  },

  // Invoices
  invoices: [],
  invoicesLoading: false,
  fetchInvoices: async (filters?: import('../types').BillingFilters, force = false) => {
    if (get().invoicesLoaded && !force && !filters) return
    set({ invoicesLoading: true })
    try {
      const response = await apiClient.get('/api/billing', { params: filters })
      if (response.success) {
        set({ invoices: response.data || [], invoicesLoaded: true })
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      set({ invoicesLoading: false })
    }
  },

  createInvoice: async (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await apiClient.post('/api/billing', invoice)
      if (response.success) {
        await get().fetchInvoices(undefined, true)
      } else {
        throw new Error(response.error || 'Failed to create invoice')
      }
    } catch (error: any) {
      console.error('Error creating invoice:', error)
      set({ error: error.message || 'Failed to create invoice' })
      throw error
    }
  },

  updateInvoice: async (id: string, invoice: Partial<Invoice>) => {
    try {
      const response = await apiClient.put(`/api/billing/${id}`, invoice)
      if (response.success) {
        await get().fetchInvoices(undefined, true)
      } else {
        throw new Error(response.error || 'Failed to update invoice')
      }
    } catch (error: any) {
      console.error('Error updating invoice:', error)
      set({ error: error.message || 'Failed to update invoice' })
      throw error
    }
  },

  recordPayment: async (invoiceId: string, amount: number, method: string) => {
    try {
      const response = await apiClient.post(`/api/billing/${invoiceId}/pay`, { amount, method })
      if (response.success) {
        await get().fetchInvoices(undefined, true)
        await get().fetchStats(true)
      } else {
        throw new Error(response.error || 'Failed to record payment')
      }
    } catch (error: any) {
      console.error('Error recording payment:', error)
      set({ error: error.message || 'Failed to record payment' })
      throw error
    }
  },

  // Classes
  classes: [],
  classesLoading: false,
  fetchClasses: async (force = false) => {
    if (get().classesLoaded && !force) return
    set({ classesLoading: true })
    try {
      const response = await apiClient.get('/api/classes')
      if (response.success) {
        set({ classes: response.data || [], classesLoaded: true })
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      set({ classesLoading: false })
    }
  },

  createClass: async (classData: Omit<FitnessClass, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await apiClient.post('/api/classes', classData)
      if (response.success) {
        await get().fetchClasses(true)
      } else {
        throw new Error(response.error || 'Failed to create class')
      }
    } catch (error: any) {
      console.error('Error creating class:', error)
      set({ error: error.message || 'Failed to create class' })
      throw error
    }
  },

  updateClass: async (id: string, classData: Partial<FitnessClass>) => {
    try {
      const response = await apiClient.put(`/api/classes/${id}`, classData)
      if (response.success) {
        await get().fetchClasses(true)
      } else {
        throw new Error(response.error || 'Failed to update class')
      }
    } catch (error: any) {
      console.error('Error updating class:', error)
      set({ error: error.message || 'Failed to update class' })
      throw error
    }
  },

  deleteClass: async (id: string) => {
    try {
      const response = await apiClient.delete(`/api/classes/${id}`)
      if (response.success) {
        await get().fetchClasses(true)
      } else {
        throw new Error(response.error || 'Failed to delete class')
      }
    } catch (error: any) {
      console.error('Error deleting class:', error)
      set({ error: error.message || 'Failed to delete class' })
      throw error
    }
  },

  // Inventory
  inventory: [],
  inventoryLoading: false,
  fetchInventory: async (filters?: import('../types').InventoryFilters, force = false) => {
    if (get().inventoryLoaded && !force && !filters) return
    set({ inventoryLoading: true, error: null })
    try {
      const response = await apiClient.get('/api/inventory', { params: filters })
      if (response.success) {
        set({ inventory: response.data || [], inventoryLoaded: true })
      }
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      set({ inventoryLoading: false })
    }
  },

  addInventoryItem: async (item: Omit<InventoryItem, 'id' | 'createdAt' | 'lastUpdated'>) => {
    try {
      const response = await apiClient.post('/api/inventory', item)
      if (response.success) {
        await get().fetchInventory(undefined, true)
      } else {
        throw new Error(response.error || 'Failed to add inventory item')
      }
    } catch (error: any) {
      console.error('Error adding inventory item:', error)
      set({ error: error.message || 'Failed to add inventory item' })
      throw error
    }
  },

  updateInventoryItem: async (id: string, item: Partial<InventoryItem>) => {
    try {
      const response = await apiClient.put(`/api/inventory/${id}`, item)
      if (response.success) {
        await get().fetchInventory(undefined, true)
      } else {
        throw new Error(response.error || 'Failed to update inventory item')
      }
    } catch (error: any) {
      console.error('Error updating inventory item:', error)
      set({ error: error.message || 'Failed to update inventory item' })
      throw error
    }
  },

  deleteInventoryItem: async (id: string) => {
    try {
      const response = await apiClient.delete(`/api/inventory/${id}`)
      if (response.success) {
        await get().fetchInventory(undefined, true)
      } else {
        throw new Error(response.error || 'Failed to delete inventory item')
      }
    } catch (error: any) {
      console.error('Error deleting inventory item:', error)
      set({ error: error.message || 'Failed to delete inventory item' })
      throw error
    }
  },

  // Staff
  staff: [],
  staffLoading: false,
  fetchStaff: async () => {
    set({ staffLoading: true })
    try {
      const response = await apiClient.get('/api/staff')
      if (response.success) {
        set({ staff: response.data || [] })
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      set({ staffLoading: false })
    }
  },

  addStaffMember: async (staffData: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await apiClient.post('/api/staff', staffData)
      if (response.success) {
        await get().fetchStaff()
      } else {
        throw new Error(response.error || 'Failed to add staff member')
      }
    } catch (error: any) {
      console.error('Error adding staff member:', error)
      set({ error: error.message || 'Failed to add staff member' })
      throw error
    }
  },

  updateStaffMember: async (id: string, staffData: Partial<Staff>) => {
    try {
      const response = await apiClient.put(`/api/staff/${id}`, staffData)
      if (response.success) {
        await get().fetchStaff()
      } else {
        throw new Error(response.error || 'Failed to update staff member')
      }
    } catch (error: any) {
      console.error('Error updating staff member:', error)
      set({ error: error.message || 'Failed to update staff member' })
      throw error
    }
  },

  deleteStaffMember: async (id: string) => {
    try {
      const response = await apiClient.delete(`/api/staff/${id}`)
      if (response.success) {
        await get().fetchStaff()
      } else {
        throw new Error(response.error || 'Failed to delete staff member')
      }
    } catch (error: any) {
      console.error('Error deleting staff member:', error)
      set({ error: error.message || 'Failed to delete staff member' })
      throw error
    }
  },

  // Notifications
  notifications: [],
  unreadCount: 0,
  fetchNotifications: async () => {
    try {
      const response = await apiClient.get<Notification[]>('/api/notifications')
      if (response.success && response.data) {
        const notifications: Notification[] = Array.isArray(response.data)
          ? response.data
          : (response.data as any).data || []
        const unreadCount = notifications.filter((notification: Notification) => !notification.read).length
        set({ notifications, unreadCount })
      }
    } catch (error: any) {
      console.error('Error fetching notifications:', error)
      set({ error: error.message })
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      await apiClient.put(`/api/notifications/${notificationId}`, { read: true })
      await get().fetchNotifications()
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  },

  // Settings
  settings: null,
  fetchSettings: async () => {
    try {
      const response = await apiClient.get('/api/settings')
      if (response.success && response.data) {
        set({ settings: response.data })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  },

  updateSettings: async (settings: Partial<AppSettings>) => {
    try {
      const response = await apiClient.patch('/api/settings', settings)
      if (response.success && response.data) {
        set({ settings: response.data })
      }
    } catch (error) {
      console.error('Error updating settings:', error)
    }
  },
  
  // Branches
  branches: [],
  branchesLoading: false,
  fetchBranches: async () => {
    set({ branchesLoading: true })
    try {
      const response = await apiClient.get('/api/branches')
      if (response.success && response.data) {
        set({ branches: response.data })
      }
    } catch (error) {
      console.error('Error fetching branches:', error)
    } finally {
      set({ branchesLoading: false })
    }
  },

  addBranch: async (branchData: Omit<Branch, 'id'>) => {
    try {
      const response = await apiClient.post('/api/branches', branchData)
      if (response.success) {
        await get().fetchBranches()
      } else {
        throw new Error(response.error || 'Failed to add branch')
      }
    } catch (error: any) {
      console.error('Error adding branch:', error)
      set({ error: error.message || 'Failed to add branch' })
      throw error
    }
  },

  updateBranch: async (id: string, branchData: Partial<Branch>) => {
    try {
      const response = await apiClient.put(`/api/branches/${id}`, branchData)
      if (response.success) {
        await get().fetchBranches()
      } else {
        throw new Error(response.error || 'Failed to update branch')
      }
    } catch (error: any) {
      console.error('Error updating branch:', error)
      set({ error: error.message || 'Failed to update branch' })
      throw error
    }
  },

  deleteBranch: async (id: string) => {
    try {
      const response = await apiClient.delete(`/api/branches/${id}`)
      if (response.success) {
        await get().fetchBranches()
      } else {
        throw new Error(response.error || 'Failed to delete branch')
      }
    } catch (error: any) {
      console.error('Error deleting branch:', error)
      set({ error: error.message || 'Failed to delete branch' })
      throw error
    }
  },

  fetchStats: async (force = false) => {
    if (get().stats && !force) return
    set({ statsLoading: true })
    try {
      const response = await apiClient.get('/api/dashboard-stats')
      if (response.success) {
        set({ stats: response.data })
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      set({ statsLoading: false })
    }
  },

  // CRM Leads
  leads: [],
  leadsLoading: false,
  fetchLeads: async (force = false) => {
    if (get().leadsLoaded && !force) return
    set({ leadsLoading: true, error: null })
    try {
      const response = await apiClient.get('/api/leads')
      if (response.success) {
        set({ leads: response.data || [], leadsLoaded: true })
      } else {
        throw new Error(response.error || 'Failed to fetch leads')
      }
    } catch (error: any) {
      console.error('Error fetching leads:', error)
      set({ error: error.message || 'Failed to fetch leads' })
    } finally {
      set({ leadsLoading: false })
    }
  },
  createLead: async (lead: any) => {
    try {
      const res = await apiClient.post('/api/leads', lead)
      if (res.success) {
        await get().fetchLeads(true)
      } else {
        throw new Error(res.error || 'Failed to create lead')
      }
    } catch (error: any) {
      console.error('Error creating lead:', error)
      set({ error: error.message || 'Failed to create lead' })
      throw error
    }
  },
  updateLead: async (id: string, lead: any) => {
    try {
      const res = await apiClient.put(`/api/leads/${id}`, lead)
      if (res.success) {
        await get().fetchLeads(true)
      } else {
        throw new Error(res.error || 'Failed to update lead')
      }
    } catch (error: any) {
      console.error('Error updating lead:', error)
      set({ error: error.message || 'Failed to update lead' })
      throw error
    }
  },
  deleteLead: async (id: string) => {
    try {
      const res = await apiClient.delete(`/api/leads/${id}`)
      if (res.success) {
        await get().fetchLeads(true)
      } else {
        throw new Error(res.error || 'Failed to delete lead')
      }
    } catch (error: any) {
      console.error('Error deleting lead:', error)
      set({ error: error.message || 'Failed to delete lead' })
      throw error
    }
  },
  convertLead: async (id: string, memberData: any) => {
    try {
      const res = await apiClient.post(`/api/leads/${id}/convert`, memberData)
      if (res.success) {
        await get().fetchLeads(true)
        await get().fetchMembers(undefined, true)
      } else {
        throw new Error(res.error || 'Failed to convert lead')
      }
    } catch (error: any) {
      console.error('Error converting lead:', error)
      set({ error: error.message || 'Failed to convert lead' })
      throw error
    }
  },

  // Expenses
  fetchExpenses: async (force = false) => {
    if (get().expensesLoaded && !force) return
    set({ expensesLoading: true, error: null })
    try {
      const response = await apiClient.get('/api/expenses')
      if (response.success) {
        set({ expenses: response.data || [], expensesLoaded: true })
      } else {
        throw new Error(response.error || 'Failed to fetch expenses')
      }
    } catch (error: any) {
      console.error('Error fetching expenses:', error)
      set({ error: error.message || 'Failed to fetch expenses' })
    } finally {
      set({ expensesLoading: false })
    }
  },
  createExpense: async (expense: any) => {
    try {
      const res = await apiClient.post('/api/expenses', expense)
      if (res.success) {
        await get().fetchExpenses(true)
        await get().fetchStats(true)
      } else {
        throw new Error(res.error || 'Failed to create expense')
      }
    } catch (error: any) {
      console.error('Error creating expense:', error)
      set({ error: error.message || 'Failed to create expense' })
      throw error
    }
  },
  updateExpense: async (id: string, expense: any) => {
    try {
      const res = await apiClient.put(`/api/expenses/${id}`, expense)
      if (res.success) {
        await get().fetchExpenses(true)
        await get().fetchStats(true)
      } else {
        throw new Error(res.error || 'Failed to update expense')
      }
    } catch (error: any) {
      console.error('Error updating expense:', error)
      set({ error: error.message || 'Failed to update expense' })
      throw error
    }
  },
  deleteExpense: async (id: string) => {
    try {
      const res = await apiClient.delete(`/api/expenses/${id}`)
      if (res.success) {
        await get().fetchExpenses(true)
        await get().fetchStats(true)
      } else {
        throw new Error(res.error || 'Failed to delete expense')
      }
    } catch (error: any) {
      console.error('Error deleting expense:', error)
      set({ error: error.message || 'Failed to delete expense' })
      throw error
    }
  },

  plans: [],
  plansLoading: false,
  fetchPlans: async (force = false) => {
    if (get().plansLoaded && !force) return
    set({ plansLoading: true, error: null })
    try {
      const response = await apiClient.get('/api/plans')
      if (response.success) {
        set({ plans: response.data || [], plansLoaded: true })
      } else {
        throw new Error(response.error || 'Failed to fetch plans')
      }
    } catch (error: any) {
      console.error('Error fetching plans:', error)
      set({ error: error.message || 'Failed to fetch plans' })
    } finally {
      set({ plansLoading: false })
    }
  },
  createPlan: async (plan: any) => {
    try {
      const res = await apiClient.post('/api/plans', plan)
      if (res.success) {
        await get().fetchPlans(true)
      } else {
        throw new Error(res.error || 'Failed to create plan')
      }
    } catch (error: any) {
      console.error('Error creating plan:', error)
      set({ error: error.message || 'Failed to create plan' })
      throw error
    }
  },
  updatePlan: async (id: string, plan: any) => {
    try {
      const res = await apiClient.put(`/api/plans/${id}`, plan)
      if (res.success) {
        await get().fetchPlans(true)
      } else {
        throw new Error(res.error || 'Failed to update plan')
      }
    } catch (error: any) {
      console.error('Error updating plan:', error)
      set({ error: error.message || 'Failed to update plan' })
      throw error
    }
  },
  deletePlan: async (id: string) => {
    try {
      const res = await apiClient.delete(`/api/plans/${id}`)
      if (res.success) {
        await get().fetchPlans(true)
      } else {
        throw new Error(res.error || 'Failed to delete plan')
      }
    } catch (error: any) {
      console.error('Error deleting plan:', error)
      set({ error: error.message || 'Failed to delete plan' })
      throw error
    }
  },

  // Activity Logs
  activityLogs: [],
  activityLogsLoading: false,
  fetchActivityLogs: async (filters?: any) => {
    set({ activityLogsLoading: true })
    try {
      const response = await apiClient.get('/api/activity-log', { params: filters || {} })
      if (response.success) {
        set({ activityLogs: response.data || [] })
        return response.data || []
      }
      return []
    } catch (error) {
      console.error('Error fetching activity logs:', error)
      return []
    } finally {
      set({ activityLogsLoading: false })
    }
  },
  logActivity: async (action: string, entityType: string, entityId?: string, entityName?: string, details?: string) => {
    try {
      const response = await apiClient.post('/api/activity-log', {
        action,
        entityType,
        entityId,
        entityName,
        details
      })
      if (response.success) {
        // Refresh activity logs
        await get().fetchActivityLogs()
      }
    } catch (error) {
      console.error('Error logging activity:', error)
    }
  },

  // Real-time SSE
  initStream: () => {
    if (typeof window === 'undefined') return () => {};
    const evtSource = new EventSource('/api/sync/stream');
    
    evtSource.onmessage = (event) => {
      console.log('SSE Generic Pulse:', event.data);
    };

    const handleUpdate = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`SSE Event [${event.type}]:`, data);
        
        if (event.type === 'attendance:update') {
          get().fetchAttendance(undefined, true);
          get().fetchStats(true);
        } else if (event.type === 'attendance:error') {
          get().addScanError({
            id: Math.random().toString(),
            timestamp: new Date().toISOString(),
            ...data
          });
        } else if (event.type.startsWith('billing:')) {
          get().fetchInvoices(undefined, true);
          get().fetchStats(true);
        } else if (event.type.startsWith('members:')) {
          get().fetchMembers(undefined, true);
          get().fetchStats(true);
        } else if (event.type.startsWith('classes:')) {
          get().fetchClasses(true);
        } else if (event.type.startsWith('leads:')) {
          get().fetchLeads(true);
        } else if (event.type.startsWith('plans:')) {
          get().fetchPlans(true);
        } else if (event.type.startsWith('expenses:')) {
          get().fetchExpenses(true);
          get().fetchStats(true);
        } else if (event.type.startsWith('notifications:')) {
          get().fetchNotifications();
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    const events = [
      'attendance:update',
      'attendance:error',
      'billing:update',
      'billing:delete',
      'members:update',
      'members:update_bulk',
      'members:delete',
      'classes:update',
      'classes:delete',
      'leads:update',
      'leads:delete',
      'plans:update',
      'plans:delete',
      'expenses:update',
      'expenses:delete',
      'activity:new',
      'notifications:new',
      'notifications:update'
    ];

    events.forEach(evtName => {
      evtSource.addEventListener(evtName, handleUpdate);
    });

    return () => {
      evtSource.close();
    };
  },
}))
