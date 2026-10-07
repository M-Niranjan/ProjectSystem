import api from './api';

export interface AppNotification {
  id: string | number;
  notificationId: string;
  recipientId: string;
  recipientUid?: string;
  senderId?: string;
  senderName?: string;
  organizationId: string;
  type: string;
  title: string;
  message: string;
  entityId?: string;
  entityType?: 'task' | 'project' | 'conversation' | 'team' | 'document' | 'approval' | 'security' | 'system';
  isRead: boolean;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  actionUrl?: string;
  metadata?: any;
  eventId?: string;
  taskId?: number;
  projectId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  inApp: boolean;
  push: boolean;
  email: boolean;
  categories: {
    tasks: { inApp: boolean; push: boolean; email: boolean };
    projects: { inApp: boolean; push: boolean; email: boolean };
    communication: { inApp: boolean; push: boolean; email: boolean };
    mentions: { inApp: boolean; push: boolean; email: boolean };
    security: { inApp: boolean; push: boolean; email: boolean };
    approvals: { inApp: boolean; push: boolean; email: boolean };
  };
}

export interface DispatchNotificationOptions {
  title: string;
  message: string;
  type?: string;
  recipientId?: number | string;
  recipientUid?: string;
  recipientEmail?: string;
  entityId?: string | number;
  entityType?: 'task' | 'project' | 'conversation' | 'team' | 'document' | 'approval' | 'security' | 'system';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export class NotificationApiService {
  public static async fetchNotifications(): Promise<AppNotification[]> {
    try {
      const response = await api.get('/api/notifications');
      return response.data || [];
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      return [];
    }
  }

  public static async fetchUnreadNotifications(): Promise<AppNotification[]> {
    try {
      const response = await api.get('/api/notifications/unread');
      return response.data || [];
    } catch (err) {
      console.error('Failed to fetch unread notifications:', err);
      return [];
    }
  }

  public static async markAsRead(id: string | number): Promise<boolean> {
    try {
      await api.put(`/api/notifications/${id}/read`);
      return true;
    } catch (err) {
      console.error(`Failed to mark notification ${id} as read:`, err);
      return false;
    }
  }

  public static async markAsUnread(id: string | number): Promise<boolean> {
    try {
      await api.put(`/api/notifications/${id}/unread`);
      return true;
    } catch (err) {
      console.error(`Failed to mark notification ${id} as unread:`, err);
      return false;
    }
  }

  public static async markAllAsRead(): Promise<boolean> {
    try {
      await api.put('/api/notifications/read-all');
      return true;
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      return false;
    }
  }

  public static async deleteNotification(id: string | number): Promise<boolean> {
    try {
      await api.delete(`/api/notifications/${id}`);
      return true;
    } catch (err) {
      console.error(`Failed to delete notification ${id}:`, err);
      return false;
    }
  }

  public static async registerDeviceToken(fcmToken: string, platform: string = 'android', deviceName?: string): Promise<boolean> {
    try {
      await api.post('/api/notifications/device-token', {
        fcmToken,
        platform,
        deviceName,
      });
      return true;
    } catch (err) {
      console.error('Failed to register device token on backend:', err);
      return false;
    }
  }

  public static async unregisterDeviceToken(fcmToken?: string): Promise<boolean> {
    try {
      await api.delete('/api/notifications/device-token', {
        data: { fcmToken },
      });
      return true;
    } catch (err) {
      console.error('Failed to unregister device token on backend:', err);
      return false;
    }
  }

  public static async fetchPreferences(): Promise<NotificationPreferences | null> {
    try {
      const response = await api.get('/api/notifications/preferences');
      return response.data;
    } catch (err) {
      console.error('Failed to fetch notification preferences:', err);
      return null;
    }
  }

  public static async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      await api.put('/api/notifications/preferences', { preferences });
      return true;
    } catch (err) {
      console.error('Failed to update notification preferences:', err);
      return false;
    }
  }

  public static async dispatchNotification(options: DispatchNotificationOptions): Promise<boolean> {
    try {
      await api.post('/api/notifications', options);
      return true;
    } catch (err) {
      console.error('Failed to dispatch notification:', err);
      return false;
    }
  }
}

/**
 * Backward-compatible helper for existing components
 */
export async function dispatchNotificationAlert(options: DispatchNotificationOptions) {
  return NotificationApiService.dispatchNotification(options);
}
