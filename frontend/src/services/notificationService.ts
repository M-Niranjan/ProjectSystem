import api from './api';
import { triggerMobilePushNotification } from './mobilePushService';

export interface DispatchNotificationOptions {
  title: string;
  message: string;
  type?: 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'STEP_APPROVED' | 'STEP_CHANGES_REQUESTED' | 'PROJECT_UPDATE' | 'BLOCKER_ALERT' | 'SYSTEM_ALERT';
  recipientId?: number | string;
  recipientName?: string;
  recipientEmail?: string;
}

/**
 * Dispatch an alert notification to all users or a specific team member
 * Triggers:
 * 1. Mobile Phone / System Push Notification (vibration, sound, lockscreen badge)
 * 2. Email Notification Dispatch
 * 3. In-App Notification Hub & Unread Bell Counter
 */
export async function dispatchNotificationAlert(options: DispatchNotificationOptions) {
  try {
    const payload = {
      title: options.title,
      message: options.message,
      type: options.type || 'SYSTEM_ALERT',
      recipientId: options.recipientId || 'ALL',
      recipientName: options.recipientName || 'ALL',
      recipientEmail: options.recipientEmail,
    };

    await api.post('/api/notifications', payload).catch(() => null);

    // 1. Trigger Native Mobile Phone / System Push Notification
    triggerMobilePushNotification(options.title, options.message);

    // 2. Log Email & Mobile Alert Dispatch
    console.log(`📱 [MOBILE PUSH & EMAIL NOTIFICATION DISPATCHED]
  Title:   ${options.title}
  Message: ${options.message}
  Target:  ${options.recipientEmail || options.recipientName || 'ALL TEAM MEMBERS'}`);

    // 3. Trigger immediate local event for real-time Navbar update
    window.dispatchEvent(new Event('new-notification-alert'));
  } catch (err) {
    console.error('Failed to dispatch notification alert', err);
  }
}
