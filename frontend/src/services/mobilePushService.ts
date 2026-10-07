/**
 * Mobile & Web System Push Notification Service
 * Integrates Firebase Cloud Messaging (FCM) and Native Notification API.
 * Registers Android / Web device tokens on the backend and handles push permissions.
 */
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { NotificationApiService } from './notificationService';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let messagingInstance: any = null;

async function getFirebaseMessaging() {
  if (typeof window === 'undefined') return null;
  if (messagingInstance) return messagingInstance;
  try {
    const supported = await isSupported();
    if (supported) {
      const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      messagingInstance = getMessaging(app);
      return messagingInstance;
    }
  } catch (err) {
    console.warn('Firebase Messaging is not supported in this environment:', err);
  }
  return null;
}

// Request system notification permission and register FCM device token
export async function requestMobilePushPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    let granted = false;
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        granted = true;
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        granted = permission === 'granted';
      }
    }

    if (granted) {
      // Attempt to retrieve and register FCM device token
      try {
        const messaging = await getFirebaseMessaging();
        if (messaging) {
          const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
          const token = await getToken(messaging, vapidKey ? { vapidKey } : undefined);
          if (token) {
            const isAndroid = /android/i.test(navigator.userAgent);
            const isMobile = /iphone|ipad|ipod|android/i.test(navigator.userAgent);
            const platform = isAndroid ? 'android' : isMobile ? 'mobile_web' : 'web';
            const deviceName = isAndroid ? 'Android Phone/Tablet' : isMobile ? 'Mobile Browser' : 'Desktop Browser';
            
            await NotificationApiService.registerDeviceToken(token, platform, deviceName);
            console.log('✅ Registered FCM device token for push notifications.');

            // Listen for foreground push messages
            onMessage(messaging, (payload) => {
              if (payload.notification) {
                const { title, body } = payload.notification;
                triggerMobilePushNotification(title || 'Notification', body || '');
              }
            });
          }
        }
      } catch (fcmErr) {
        console.warn('FCM token registration notice (standard notifications still active):', fcmErr);
      }
      return true;
    }
  } catch (err) {
    console.warn('System push notification permission request failed:', err);
  }
  return false;
}

/**
 * Trigger a native system notification on mobile phone / browser
 */
export function triggerMobilePushNotification(title: string, message: string, icon: string = '/logo.png') {
  if (typeof window === 'undefined') return;

  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: message,
        icon: icon,
        badge: icon,
        tag: 'pm-workspace-alert-' + Date.now(),
        vibrate: [200, 100, 200, 100, 300],
      } as any);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  } catch (err) {
    console.warn('Unable to dispatch native mobile system push notification:', err);
  }
}
