import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { User, Member, Attendance, Invoice, FitnessClass, InventoryItem, Staff, Notification, AppSettings, Branch } from '../types'
import { apiClient } from './api-client'

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
  bulkCreateMembers: (members: any[]) => Promise<void>
  updateMember: (id: string, member: Partial<Member>) => Promise<void>
  deleteMember: (id: string) => Promise<void>

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
  // Activity Logs
  activityLogs: any[]
  activityLogsLoading: boolean
  fetchActivityLogs: (filters?: any) => Promise<any[]>
  logActivity: (action: string, entityType: string, entityId?: string, entityName?: string, details?: string) => Promise<void>
  // Real-time
  initStream: () => void
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
            localStorage.clear()
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
            set({ user: null, isAuthenticated: false })
          }
        },



        checkAuth: async () => {
          set({ isLoading: true })
          try {
            const hasAccessToken = typeof window !== 'undefined' && !!localStorage.getItem('accessToken')
            const hasRefreshToken = typeof window !== 'undefined' && !!localStorage.getItem('refreshToken')
            const hasCookieToken = typeof document !== 'undefined' && document.cookie.includes('token=')

            if (!hasAccessToken && !hasRefreshToken && !hasCookieToken) {
              set({ user: null, isAuthenticated: false })
              return
            }

            const response = await apiClient.get('/api/auth/me')
            if (response.success && response.data) {
              set({ user: response.data, isAuthenticated: true })
            } else {
              localStorage.clear()
              document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
              set({ user: null, isAuthenticated: false })
            }
          } catch (error) {
            localStorage.clear()
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
            set({ user: null, isAuthenticated: false })
          } finally {
            set({ isLoading: false })
          }
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

  membersLoaded: false,
  attendanceLoaded: false,
  invoicesLoaded: false,
  classesLoaded: false,
  inventoryLoaded: false,
  staffLoaded: false,
  stats: null,
  statsLoading: false,

  // Members
  members: [],
  membersLoading: false,
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
      }
    } catch (error) {
      console.error('Error creating member:', error)
    }
  },

  bulkCreateMembers: async (members: any[]) => {
    try {
      const response = await apiClient.post('/api/members/bulk', { members })
      if (response.success) {
        await get().fetchMembers(undefined, true)
      }
    } catch (error) {
      console.error('Error bulk creating members:', error)
    }
  },

  updateMember: async (id: string, member: Partial<Member>) => {
    try {
      const response = await apiClient.put(`/api/members/${id}`, member)
      if (response.success) {
        await get().fetchMembers(undefined, true)
      }
    } catch (error) {
      console.error('Error updating member:', error)
    }
  },

  deleteMember: async (id: string) => {
    try {
      const response = await apiClient.delete(`/api/members/${id}`)
      if (response.success) {
        await get().fetchMembers(undefined, true)
      }
    } catch (error) {
      console.error('Error deleting member:', error)
      set({ error: 'Failed to delete member' })
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
      }
    } catch (error) {
      console.error('Error checking in member:', error)
    }
  },

  checkOutMember: async (attendanceId: string) => {
    try {
      const response = await apiClient.post(`/api/attendance/${attendanceId}/checkout`)
      if (response.success) {
        await get().fetchAttendance(undefined, true)
        await get().fetchStats(true)
      }
    } catch (error) {
      console.error('Error checking out member:', error)
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
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
    }
  },

  updateInvoice: async (id: string, invoice: Partial<Invoice>) => {
    try {
      const response = await apiClient.put(`/api/billing/${id}`, invoice)
      if (response.success) {
        await get().fetchInvoices(undefined, true)
      }
    } catch (error) {
      console.error('Error updating invoice:', error)
    }
  },

  recordPayment: async (invoiceId: string, amount: number, method: string) => {
    try {
      const response = await apiClient.post(`/api/billing/${invoiceId}/pay`, { amount, method })
      if (response.success) {
        await get().fetchInvoices(undefined, true)
        await get().fetchStats(true)
      }
    } catch (error) {
      console.error('Error recording payment:', error)
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
      }
    } catch (error) {
      console.error('Error creating class:', error)
    }
  },

  updateClass: async (id: string, classData: Partial<FitnessClass>) => {
    try {
      const response = await apiClient.put(`/api/classes/${id}`, classData)
      if (response.success) {
        await get().fetchClasses(true)
      }
    } catch (error) {
      console.error('Error updating class:', error)
    }
  },

  deleteClass: async (id: string) => {
    try {
      const response = await apiClient.delete(`/api/classes/${id}`)
      if (response.success) {
        await get().fetchClasses(true)
      }
    } catch (error) {
      console.error('Error deleting class:', error)
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
        await get().fetchInventory()
      }
    } catch (error) {
      console.error('Error adding inventory item:', error)
    }
  },

  updateInventoryItem: async (id: string, item: Partial<InventoryItem>) => {
    try {
      const response = await apiClient.put(`/api/inventory/${id}`, item)
      if (response.success) {
        await get().fetchInventory()
      }
    } catch (error) {
      console.error('Error updating inventory item:', error)
    }
  },

  deleteInventoryItem: async (id: string) => {
    try {
      const response = await apiClient.delete(`/api/inventory/${id}`)
      if (response.success) {
        await get().fetchInventory()
      }
    } catch (error) {
      console.error('Error deleting inventory item:', error)
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
      }
    } catch (error) {
      console.error('Error adding staff member:', error)
    }
  },

  updateStaffMember: async (id: string, staffData: Partial<Staff>) => {
    try {
      const response = await apiClient.put(`/api/staff/${id}`, staffData)
      if (response.success) {
        await get().fetchStaff()
      }
    } catch (error) {
      console.error('Error updating staff member:', error)
    }
  },

  deleteStaffMember: async (id: string) => {
    try {
      const response = await apiClient.delete(`/api/staff/${id}`)
      if (response.success) {
        await get().fetchStaff()
      }
    } catch (error) {
      console.error('Error deleting staff member:', error)
    }
  },

  // Notifications
  notifications: [],
  unreadCount: 0,
  fetchNotifications: async () => {
    try {
      const response = await apiClient.get<Notification[]>('/api/notifications')
      if (response.success && response.data) {
        const notifications = Array.isArray(response.data) 
          ? response.data 
          : (response.data as any).data || []
        const unreadCount = notifications.filter((n: Notification) => !n.read).length
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
      }
    } catch (error) {
      console.error('Error adding branch:', error)
    }
  },

  updateBranch: async (id: string, branchData: Partial<Branch>) => {
    try {
      const response = await apiClient.put(`/api/branches/${id}`, branchData)
      if (response.success) {
        await get().fetchBranches()
      }
    } catch (error) {
      console.error('Error updating branch:', error)
    }
  },

  deleteBranch: async (id: string) => {
    try {
      const response = await apiClient.delete(`/api/branches/${id}`)
      if (response.success) {
        await get().fetchBranches()
      }
    } catch (error) {
      console.error('Error deleting branch:', error)
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
    if (get().leads.length > 0 && !force) return
    set({ leadsLoading: true })
    try {
      const response = await apiClient.get('/api/leads')
      if (response.success) set({ leads: response.data || [] })
    } catch (error) { console.error(error) } finally { set({ leadsLoading: false }) }
  },
  createLead: async (lead: any) => {
    const res = await apiClient.post('/api/leads', lead)
    if (res.success) await get().fetchLeads(true)
  },
  updateLead: async (id: string, lead: any) => {
    const res = await apiClient.put(`/api/leads/${id}`, lead)
    if (res.success) await get().fetchLeads(true)
  },
  deleteLead: async (id: string) => {
    const res = await apiClient.delete(`/api/leads/${id}`)
    if (res.success) await get().fetchLeads(true)
  },
  convertLead: async (id: string, memberData: any) => {
    const res = await apiClient.post(`/api/leads/${id}/convert`, memberData)
    if (res.success) {
      await get().fetchLeads(true)
      await get().fetchMembers(undefined, true)
    }
  },

  // Membership Plans
  plans: [],
  plansLoading: false,
  fetchPlans: async (force = false) => {
    if (get().plans.length > 0 && !force) return
    set({ plansLoading: true })
    try {
      const response = await apiClient.get('/api/plans')
      if (response.success) set({ plans: response.data || [] })
    } catch (error) { console.error(error) } finally { set({ plansLoading: false }) }
  },
  createPlan: async (plan: any) => {
    const res = await apiClient.post('/api/plans', plan)
    if (res.success) await get().fetchPlans(true)
  },
  updatePlan: async (id: string, plan: any) => {
    const res = await apiClient.put(`/api/plans/${id}`, plan)
    if (res.success) await get().fetchPlans(true)
  },
  deletePlan: async (id: string) => {
    const res = await apiClient.delete(`/api/plans/${id}`)
    if (res.success) await get().fetchPlans(true)
  },

  // Activity Logs
  activityLogs: [],
  activityLogsLoading: false,
  fetchActivityLogs: async (filters?: any) => {
    set({ activityLogsLoading: true })
    try {
      const response = await apiClient.get('/api/activity-logs', { params: filters || {} })
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
      const response = await apiClient.post('/api/activity-logs', {
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
    if (typeof window === 'undefined') return;
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const evtSource = new EventSource(`${url}/api/sync/stream`);
    evtSource.onmessage = (event) => {
      console.log('SSE Sync Pulse:', event.data);
    };
  },
}))
