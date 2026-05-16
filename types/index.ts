// Authentication & User Types
export interface User {
  id: string
  email: string
  fullname: string
  role: 'cto' | 'ceo' | 'admin' | 'manager' | 'trainer' | 'staff'
  gymId?: string
  createdAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  fullname: string
}

// Member Types
export interface Member {
  id: string
  name: string
  email: string
  phone: string
  address?: string
  membershipType: string
  status: 'active' | 'expired' | 'pending' | 'cancelled'
  joinDate: string
  expiryDate: string
  emergencyContact?: string
  emergencyPhone?: string
  createdAt: string
  updatedAt: string
}

export interface MemberFilters {
  status?: Member['status']
  membershipType?: Member['membershipType']
  searchTerm?: string
  sortBy?: 'name' | 'joinDate' | 'expiryDate'
}

// Attendance Types
export interface Attendance {
  id: string
  memberId: string
  memberName: string
  checkInTime: string
  checkOutTime?: string
  notes?: string
  duration?: number
  recordedDate: string
  createdAt: string
}

export interface AttendanceFilters {
  memberId?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: 'checkInTime' | 'duration'
}

// Billing Types
export interface Invoice {
  id: string
  invoiceNumber: string
  memberId: string
  memberName: string
  amount: number
  status: 'paid' | 'pending' | 'overdue' | 'partial'
  description: string
  invoiceDate: string
  dueDate: string
  createdAt: string
  updatedAt: string
}

export interface Payment {
  id: string
  invoiceId: string
  amount: number
  method: 'cash' | 'card' | 'transfer' | 'cheque'
  transactionId?: string
  paymentDate: string
  notes?: string
  createdAt: string
}

export interface BillingFilters {
  status?: Invoice['status']
  dateFrom?: string
  dateTo?: string
  memberId?: string
}

// Class Types
export interface FitnessClass {
  id: string
  name: string
  description?: string
  instructorId?: string
  instructorName?: string
  time?: string
  days?: string
  schedule?: ClassSchedule[]
  maxCapacity: number
  currentEnrollment: number
  enrolledMembers?: string[]
  createdAt: string
  updatedAt: string
}

export interface ClassSchedule {
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'
  startTime: string
  endTime: string
  room?: string
}

// Inventory Types
export interface InventoryItem {
  id: string
  name: string
  category: 'Equipment' | 'Consumables' | 'Services' | 'Merchandise'
  quantity: number
  minThreshold: number
  costPerUnit: number
  supplier?: string
  lastUpdated: string
  createdAt: string
}

export interface InventoryFilters {
  category?: InventoryItem['category']
  lowStockOnly?: boolean
}

// Staff/HR Types
export interface Staff {
  id: string
  name: string
  email: string
  phone: string
  position: 'Trainer' | 'Receptionist' | 'Manager' | 'Maintenance'
  salary: number
  joinDate: string
  status: 'active' | 'inactive'
  emergencyContact?: string
  createdAt: string
  updatedAt: string
}

// Report Types
export interface DashboardStats {
  activeMembers: number
  totalMembers: number
  todaysRevenue: number
  monthlyRevenue: number
  todayVisits: number
  averageAttendance: number
  pendingPayments: number
  lowStockItems: number
  upcomingMembershipExpiries: number
}

export interface RevenueTrend {
  date: string
  revenue: number
  invoices: number
  payments: number
}

export interface AttendanceTrend {
  date: string
  visits: number
  uniqueMembers: number
  averageDuration: number
}

export interface MemberRetention {
  period: string
  totalMembers: number
  activeMembers: number
  expiredMembers: number
  retentionRate: number
}

export interface StaffPerformance {
  staffId: string
  staffName: string
  classesHeld: number
  satisfaction: number
  membersReferred: number
  totalRevenue: number
}

// Notification Types
export interface Notification {
  id: string
  userId: string
  type: 'membership_expiry' | 'low_stock' | 'payment_reminder' | 'class_update' | 'system'
  message: string
  data?: Record<string, any>
  read: boolean
  createdAt: string
}

// Settings Types
export interface AppSettings {
  gymName: string
  gymLogo?: string
  gymEmail: string
  gymPhone: string
  gymAddress: string
  currency: string
  dateFormat: string
  timeZone: string
  invoicePrefix: string
  nextInvoiceNumber: number
  membershipTypes: MembershipType[]
  defaultMembershipDays: number
}

export interface MembershipType {
  name: string
  months: number
  price: number
  description: string
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  pages: number
  success: boolean
}

// Chart Data
export interface ChartDataSet {
  label: string
  data: number[]
  borderColor?: string
  backgroundColor?: string
  fill?: boolean
}

export interface ChartConfig {
  labels: string[]
  datasets: ChartDataSet[]
}
