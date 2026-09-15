/**
 * Mobile & Web System Push Notification Service
 * Dispatches real-time native alerts directly to mobile phone notification bars and desktop browsers.
 */

// Request system notification permission for mobile phones and browsers
export async function requestMobilePushPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        return true;
      }
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
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
        renotify: true,
      } as any);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } else {
      // Auto-request permission on first alert dispatch
      requestMobilePushPermission().then((granted) => {
        if (granted) {
          new Notification(title, {
            body: message,
            icon: icon,
            badge: icon,
            tag: 'pm-workspace-alert-' + Date.now(),
            vibrate: [200, 100, 200],
          } as any);
        }
      });
    }
  } catch (err) {
    console.warn('Unable to dispatch native mobile system push notification:', err);
  }
}
