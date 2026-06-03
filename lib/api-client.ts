import axios, { AxiosInstance, AxiosError } from 'axios'
import { ApiResponse } from '../types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

let isRefreshing = false
let failedQueue: any[] = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

class ApiClient {
  private client: AxiosInstance
  private accessToken: string | null = null

  private getGymId(): string | null {
    if (typeof window === 'undefined') {
      return null
    }

    const authStorage = localStorage.getItem('auth-storage')
    if (!authStorage) {
      return null
    }

    try {
      const parsed = JSON.parse(authStorage)
      return parsed?.state?.user?.gymId || null
    } catch (error) {
      return null
    }
  }

  private getAuthContext(): { scope?: string; tenantId?: string } {
    if (typeof window === 'undefined') {
      return {}
    }

    const authStorage = localStorage.getItem('auth-storage')
    if (!authStorage) {
      return {}
    }

    try {
      const parsed = JSON.parse(authStorage)
      return {
        scope: parsed?.state?.user?.scope,
        tenantId: parsed?.state?.user?.tenantId || parsed?.state?.user?.gymId || null,
      }
    } catch {
      return {}
    }
  }

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor to add token
    this.client.interceptors.request.use((config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }

        const isAuthRoute = config.url?.startsWith('/api/auth/') || config.url?.startsWith('api/auth/')
        if (!isAuthRoute) {
          const gymId = this.getGymId()
          if (gymId) {
            config.headers['X-Gym-ID'] = gymId
            config.params = {
              ...(config.params || {}),
              gymId,
            }
          }

          const authContext = this.getAuthContext()
          if (authContext.scope) {
            config.headers['X-Scope'] = authContext.scope
          }
          if (authContext.tenantId) {
            config.headers['X-Tenant-ID'] = authContext.tenantId
          }
        }
      }
      return config
    })

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any
        const url = originalRequest?.url || ''
        const isAuthRoute = url.includes('/api/auth/login') || url.includes('/api/auth/register') || url.includes('/api/auth/refresh')

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject })
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`
                return this.client(originalRequest)
              })
              .catch((err) => {
                return Promise.reject(err)
              })
          }

          originalRequest._retry = true
          isRefreshing = true

          try {
            if (typeof window !== 'undefined') {
              const refreshToken = localStorage.getItem('refreshToken')
              if (refreshToken) {
                const response = await axios.post(
                  `${API_BASE_URL}/api/auth/refresh`,
                  { refreshToken },
                )
                if (response.data?.data?.accessToken) {
                  const newAccessToken = response.data.data.accessToken
                  localStorage.setItem('accessToken', newAccessToken)
                  document.cookie = `token=${newAccessToken}; path=/; max-age=86400; SameSite=Lax`

                  if (response.data.data.refreshToken) {
                    localStorage.setItem('refreshToken', response.data.data.refreshToken)
                  }

                  originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
                  processQueue(null, newAccessToken)
                  isRefreshing = false

                  return this.client(originalRequest)
                }
              }
            }

            processQueue(new Error('Token refresh failed'), null)
            isRefreshing = false

            if (typeof window !== 'undefined') {
              localStorage.removeItem('accessToken')
              localStorage.removeItem('refreshToken')
              localStorage.removeItem('auth-storage')
              document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
              if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                window.location.href = '/login'
              }
            }
          } catch (refreshError) {
            processQueue(refreshError, null)
            isRefreshing = false

            if (typeof window !== 'undefined') {
              localStorage.removeItem('accessToken')
              localStorage.removeItem('refreshToken')
              localStorage.removeItem('auth-storage')
              document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
              if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                window.location.href = '/login'
              }
            }
          }
        }
        return Promise.reject(error)
      },
    )
  }

  async get<T = any>(url: string, config = {}): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<ApiResponse<T>>(url, config)
      return response.data
    } catch (error) {
      return this.handleError(error)
    }
  }

  async post<T = any>(url: string, data?: any, config = {}): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<ApiResponse<T>>(url, data, config)
      return response.data
    } catch (error) {
      return this.handleError(error)
    }
  }

  async put<T = any>(url: string, data?: any, config = {}): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put<ApiResponse<T>>(url, data, config)
      return response.data
    } catch (error) {
      return this.handleError(error)
    }
  }

  async patch<T = any>(url: string, data?: any, config = {}): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.patch<ApiResponse<T>>(url, data, config)
      return response.data
    } catch (error) {
      return this.handleError(error)
    }
  }

  async delete<T = any>(url: string, config = {}): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete<ApiResponse<T>>(url, config)
      return response.data
    } catch (error) {
      return this.handleError(error)
    }
  }

  private handleError(error: any): ApiResponse {
    const message =
      error?.response?.data?.error ||
      error?.message ||
      'An error occurred while processing your request'

    return {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    }
  }
}

export const apiClient = new ApiClient()
