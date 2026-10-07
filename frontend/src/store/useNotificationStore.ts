import { create } from 'zustand';
import { collection, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { firebaseDb } from '../services/firebase';
import { AppNotification, NotificationApiService } from '../services/notificationService';

interface NotificationStoreState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  activeFilter: 'all' | 'unread';
  isPanelOpen: boolean;
  activeUserId: string | null;
  activeOrgId: string | null;
  
  // Actions
  initRealtimeListener: (userId: string, orgId?: string | null) => void;
  stopRealtimeListener: () => void;
  fetchNotificationsFallback: () => Promise<void>;
  markAsRead: (id: string | number) => Promise<void>;
  markAsUnread: (id: string | number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string | number) => Promise<void>;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  setActiveFilter: (filter: 'all' | 'unread') => void;
}

let activeUnsubscribe: Unsubscribe | null = null;
let lastKnownNotifIds = new Set<string>();

export const useNotificationStore = create<NotificationStoreState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: true,
  error: null,
  activeFilter: 'all',
  isPanelOpen: false,
  activeUserId: null,
  activeOrgId: null,

  initRealtimeListener: (userId: string, orgId?: string | null) => {
    if (!userId) {
      set({ notifications: [], unreadCount: 0, isLoading: false });
      return;
    }

    const currentUserId = get().activeUserId;
    const currentOrgId = get().activeOrgId;

    // Avoid duplicate subscriptions if already listening to the same user and org
    if (activeUnsubscribe && currentUserId === userId && currentOrgId === (orgId || null)) {
      return;
    }

    // Stop existing listener if any
    if (activeUnsubscribe) {
      activeUnsubscribe();
      activeUnsubscribe = null;
    }

    set({ isLoading: true, error: null, activeUserId: userId, activeOrgId: orgId || null });

    try {
      if (firebaseDb) {
        let q = query(
          collection(firebaseDb, 'notifications'),
          where('recipientId', '==', String(userId))
        );

        if (orgId) {
          q = query(
            collection(firebaseDb, 'notifications'),
            where('recipientId', '==', String(userId)),
            where('organizationId', '==', String(orgId))
          );
        }

        activeUnsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const rawNotifs: AppNotification[] = [];
            let unread = 0;

            snapshot.forEach((doc) => {
              const data = doc.data();
              const createdAtStr = data.createdAt?.toDate 
                ? data.createdAt.toDate().toISOString() 
                : typeof data.createdAt === 'string' 
                ? data.createdAt 
                : new Date().toISOString();
              
              const updatedAtStr = data.updatedAt?.toDate 
                ? data.updatedAt.toDate().toISOString() 
                : typeof data.updatedAt === 'string' 
                ? data.updatedAt 
                : new Date().toISOString();

              const notifItem: AppNotification = {
                id: doc.id,
                notificationId: doc.id,
                recipientId: data.recipientId || userId,
                recipientUid: data.recipientUid || userId,
                senderId: data.senderId || 'SYSTEM',
                senderName: data.senderName || 'System',
                organizationId: data.organizationId || orgId || 'org_default',
                type: data.type || 'SYSTEM_ALERT',
                title: data.title || 'Notification',
                message: data.message || '',
                entityId: data.entityId,
                entityType: data.entityType || 'system',
                isRead: !!data.isRead,
                priority: data.priority || 'MEDIUM',
                actionUrl: data.actionUrl,
                metadata: data.metadata,
                eventId: data.eventId,
                taskId: data.taskId,
                projectId: data.projectId,
                createdAt: createdAtStr,
                updatedAt: updatedAtStr,
              };

              rawNotifs.push(notifItem);
              if (!notifItem.isRead) {
                unread++;
              }
            });

            // Sort newest first
            rawNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            // Check if a brand new unread notification arrived for subtle sound / toast
            const currentIds = new Set(rawNotifs.map(n => String(n.id)));
            if (lastKnownNotifIds.size > 0) {
              const newItems = rawNotifs.filter(n => !lastKnownNotifIds.has(String(n.id)) && !n.isRead);
              if (newItems.length > 0) {
                window.dispatchEvent(new CustomEvent('new-in-app-notification', { detail: newItems[0] }));
              }
            }
            lastKnownNotifIds = currentIds;

            set({
              notifications: rawNotifs,
              unreadCount: unread,
              isLoading: false,
              error: null,
            });
          },
          (err) => {
            console.warn('Firestore realtime notification listener error, falling back to API:', err);
            get().fetchNotificationsFallback();
          }
        );
      } else {
        get().fetchNotificationsFallback();
      }
    } catch (err: any) {
      console.error('Failed to setup realtime notification listener:', err);
      get().fetchNotificationsFallback();
    }
  },

  stopRealtimeListener: () => {
    if (activeUnsubscribe) {
      activeUnsubscribe();
      activeUnsubscribe = null;
    }
    lastKnownNotifIds.clear();
    set({ activeUserId: null, activeOrgId: null });
  },

  fetchNotificationsFallback: async () => {
    set({ isLoading: true });
    try {
      const items = await NotificationApiService.fetchNotifications();
      const unread = items.filter(n => !n.isRead).length;
      set({
        notifications: items,
        unreadCount: unread,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.error('Fallback notification fetch failed:', err);
      set({
        isLoading: false,
        error: 'Unable to load notifications. Try again.',
      });
    }
  },

  markAsRead: async (id: string | number) => {
    // Optimistic UI update
    set((state) => {
      let countReduction = 0;
      const updated = state.notifications.map((n) => {
        if (n.id === id || n.notificationId === String(id)) {
          if (!n.isRead) countReduction = 1;
          return { ...n, isRead: true };
        }
        return n;
      });
      return {
        notifications: updated,
        unreadCount: Math.max(0, state.unreadCount - countReduction),
      };
    });

    await NotificationApiService.markAsRead(id);
  },

  markAsUnread: async (id: string | number) => {
    // Optimistic UI update
    set((state) => {
      let countIncrease = 0;
      const updated = state.notifications.map((n) => {
        if (n.id === id || n.notificationId === String(id)) {
          if (n.isRead) countIncrease = 1;
          return { ...n, isRead: false };
        }
        return n;
      });
      return {
        notifications: updated,
        unreadCount: state.unreadCount + countIncrease,
      };
    });

    await NotificationApiService.markAsUnread(id);
  },

  markAllAsRead: async () => {
    // Optimistic UI update
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));

    await NotificationApiService.markAllAsRead();
  },

  deleteNotification: async (id: string | number) => {
    // Optimistic UI update
    set((state) => {
      const target = state.notifications.find(n => n.id === id || n.notificationId === String(id));
      const wasUnread = target && !target.isRead;
      return {
        notifications: state.notifications.filter(n => n.id !== id && n.notificationId !== String(id)),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    });

    await NotificationApiService.deleteNotification(id);
  },

  setPanelOpen: (open: boolean) => set({ isPanelOpen: open }),
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  setActiveFilter: (filter: 'all' | 'unread') => set({ activeFilter: filter }),
}));
