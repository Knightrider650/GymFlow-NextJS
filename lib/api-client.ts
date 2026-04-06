import axios, { AxiosInstance, AxiosError } from 'axios'
import { ApiResponse } from '../types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

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

        const gymId = this.getGymId()
        if (gymId) {
          config.headers['X-Gym-ID'] = gymId
          config.params = {
            ...(config.params || {}),
            gymId,
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
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true
          try {
            if (typeof window !== 'undefined') {
              const refreshToken = localStorage.getItem('refreshToken')
              if (refreshToken) {
                const response = await axios.post(
                  `${API_BASE_URL}/api/auth/refresh`,
                  { refreshToken },
                )
                if (response.data?.data?.accessToken) {
                  localStorage.setItem('accessToken', response.data.data.accessToken)
                  originalRequest.headers.Authorization = `Bearer ${response.data.data.accessToken}`
                  return this.client(originalRequest)
                }
              }
            }
          } catch (refreshError) {
            if (typeof window !== 'undefined') {
              localStorage.clear()
              window.location.href = '/login'
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
