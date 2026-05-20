'use client'

import { useEffect } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks'
import { Trash2, CheckCheck } from 'lucide-react'
import { formatDateTime } from '@/utils/format'

export default function NotificationsPage() {
  const { notifications, unreadCount, fetchNotifications, markAsRead } = useNotifications()

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const typeColors: Record<string, string> = {
    membership_expiry: 'danger',
    low_stock: 'warning',
    payment_reminder: 'warning',
   class_update: 'info',
    system: 'secondary',
  }

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground py-8">
                  No notifications yet
                </p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => (
              <Card
                key={notification.id}
                className={notification.read ? '' : 'border-primary/50 bg-primary/5'}
              >
                <CardContent className="flex items-start justify-between py-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={typeColors[notification.type] as any}>
                        {String(notification.type).replace('_', ' ')}
                      </Badge>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-sm font-medium">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {!notification.read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </ProtectedLayout>
  )
}
