import React, { useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useCommunicationStore } from '../../store/useCommunicationStore';
import { firebaseDb, firebaseAuth } from '../../services/firebase';
import { playIncomingChatChime } from '../../utils/chatSound';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';

/**
 * GlobalCommunicationSyncProvider
 * 
 * Provides background real-time communication synchronization:
 * 1. Independent User Presence Lifecycle:
 *    - Heartbeat updates lastActiveAt & lastSeen every 25s
 *    - Detects tab close, pagehide, beforeunload, visibilitychange, and offline
 *    - Automatically marks offline upon tab close or network disconnect
 * 2. Real-Time Delivery Acknowledgment (✓ -> ✓✓):
 *    - Listens for messages sent to current user across all user identifiers
 *    - Plays soft chime when incoming message arrives while recipient is elsewhere
 *    - Acknowledges delivery or marks read if conversation is open
 * 3. App-Wide Real-Time Unread Counters:
 *    - Maintains unread badge counts across all conversations and logged-in user identities
 *    - Updates instantly without page refresh for Sidebar, Header Navbar, and Mobile Dock
 */
export const GlobalCommunicationSyncProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, token, activeOrganization } = useAuthStore();
  const currentOpenConversationId = useCommunicationStore((s) => s.currentOpenConversationId);

  const currentUid = firebaseAuth.currentUser?.uid || user?.uid || (user ? String((user as any).firebaseUid || user.id) : null);
  const orgId = String(
    activeOrganization?.organizationId ||
    activeOrganization?.id ||
    (user as any)?.organizationId ||
    'org_default'
  ).trim();

  // All known identifiers for current user (Firebase UID, SQL ID, email, sanitized email)
  const myIds = Array.from(new Set([
    String(firebaseAuth.currentUser?.uid || ''),
    String(user?.uid || ''),
    String((user as any)?.firebaseUid || ''),
    String(user?.id || ''),
    String(user?.email || '').toLowerCase(),
    String(user?.email || '').toLowerCase().replace(/\./g, '_'),
  ].filter(Boolean)));

  // Ref to hold delivery listener unsubscribe
  const deliveryUnsubRef = useRef<(() => void) | null>(null);

  // 1. PRESENCE LIFECYCLE & HEARTBEAT
  useEffect(() => {
    if (!firebaseDb || !currentUid || !token) return;

    const userDocRef = doc(firebaseDb, 'users', currentUid);

    const markOnline = () => {
      if (!navigator.onLine) return;
      try {
        setDoc(
          userDocRef,
          {
            uid: currentUid,
            isOnline: true,
            status: 'online',
            lastSeen: serverTimestamp(),
            lastActiveAt: serverTimestamp(),
            ...(orgId ? { organizationId: orgId } : {}),
            name: user?.name || undefined,
            email: user?.email || undefined,
            role: user?.role || undefined,
            profilePhoto: user?.profilePhoto || undefined,
          },
          { merge: true }
        ).catch(() => {});
      } catch (e) {}
    };

    const markOffline = () => {
      try {
        setDoc(
          userDocRef,
          {
            isOnline: false,
            status: 'offline',
            lastSeen: serverTimestamp(),
          },
          { merge: true }
        ).catch(() => {});
      } catch (e) {}
    };

    // Mark online immediately upon mount/login
    markOnline();

    // Heartbeat every 25 seconds while active
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        markOnline();
      }
    }, 25000);

    // Visibility change handler
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        markOnline();
      } else {
        markOffline();
      }
    };

    const handleOnline = () => markOnline();
    const handleOffline = () => markOffline();
    const handleBeforeUnload = () => markOffline();
    const handlePageHide = () => markOffline();

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      markOffline();
    };
  }, [currentUid, orgId, token, user?.name, user?.email, user?.role, user?.profilePhoto]);

  // 2. REAL-TIME DELIVERY ACKNOWLEDGMENT (✓ -> ✓✓) & INCOMING CHIME
  useEffect(() => {
    if (!firebaseDb || myIds.length === 0 || !token) {
      if (deliveryUnsubRef.current) {
        deliveryUnsubRef.current();
        deliveryUnsubRef.current = null;
      }
      return;
    }

    try {
      // Query for incoming messages destined for this user across all their UIDs/IDs
      const targetQueryIds = myIds.slice(0, 10);
      const qIncoming = query(
        collection(firebaseDb, 'messages'),
        where('receiverId', 'in', targetQueryIds),
        where('status', '==', 'sent')
      );

      const unsubscribe = onSnapshot(
        qIncoming,
        (snapshot) => {
          if (snapshot.empty) return;

          let shouldPlayChime = false;

          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const senderId = String(data.senderId || '');

            // Don't deliver or chime own messages
            if (myIds.includes(senderId)) return;

            const convId = data.conversationId;
            const isCurrentlyViewingConv =
              currentOpenConversationId && currentOpenConversationId === convId;

            if (isCurrentlyViewingConv) {
              // Recipient is looking at the conversation right now -> Mark as READ directly!
              updateDoc(doc(firebaseDb, 'messages', docSnap.id), {
                status: 'read',
                isRead: true,
                readAt: serverTimestamp(),
                readBy: arrayUnion(String(currentUid)),
              }).catch(() => {});

              if (convId) {
                const clearPayload: Record<string, any> = {
                  lastMessageIsRead: true,
                  lastMessageStatus: 'read',
                };
                myIds.forEach(id => {
                  clearPayload[`unreadCounts.${id}`] = 0;
                  clearPayload[`unreadCounts.${id.replace(/\./g, '_')}`] = 0;
                });
                updateDoc(doc(firebaseDb, 'conversations', convId), clearPayload).catch(() => {});
              }
            } else {
              // Recipient is elsewhere in app -> Acknowledge DELIVERY and trigger soft chime
              shouldPlayChime = true;
              updateDoc(doc(firebaseDb, 'messages', docSnap.id), {
                status: 'delivered',
                deliveredAt: serverTimestamp(),
                deliveredTo: arrayUnion(String(currentUid)),
              }).catch(() => {});

              if (convId) {
                updateDoc(doc(firebaseDb, 'conversations', convId), {
                  lastMessageStatus: 'delivered',
                }).catch(() => {});
              }
            }
          });

          if (shouldPlayChime) {
            playIncomingChatChime();
          }
        },
        (err) => {
          console.warn('Delivery acknowledgment subscription notice:', err.message);
        }
      );

      deliveryUnsubRef.current = unsubscribe;
    } catch (err) {
      console.warn('Could not establish delivery acknowledgment listener:', err);
    }

    return () => {
      if (deliveryUnsubRef.current) {
        deliveryUnsubRef.current();
        deliveryUnsubRef.current = null;
      }
    };
  }, [currentUid, myIds.join(','), token, currentOpenConversationId]);

  // 3. REAL-TIME APP-WIDE UNREAD CONVERSATION COUNTER
  // Runs everywhere (Dashboard, Tasks, Settings, Profile) so sidebar, footer dock, and header navbar update instantly
  useEffect(() => {
    if (!firebaseDb || myIds.length === 0 || !token) return;

    const orgFilter = Array.from(new Set([
      orgId,
      activeOrganization?.organizationId,
      activeOrganization?.id,
      (user as any)?.organizationId,
      'org_default',
      'default-org'
    ].filter(Boolean) as string[]));

    try {
      const qConversations = query(
        collection(firebaseDb, 'conversations'),
        where('organizationId', 'in', orgFilter)
      );

      const unsubscribe = onSnapshot(
        qConversations,
        (snapshot) => {
          const distinctUnreads: Record<string, number> = {};

          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            let unreadForMe = 0;

            for (const id of myIds) {
              const safeId = id.replace(/\./g, '_');
              // 1. Nested map check
              if (data.unreadCounts && typeof data.unreadCounts === 'object') {
                if (typeof data.unreadCounts[id] === 'number') {
                  unreadForMe = Math.max(unreadForMe, data.unreadCounts[id]);
                }
                if (typeof data.unreadCounts[safeId] === 'number') {
                  unreadForMe = Math.max(unreadForMe, data.unreadCounts[safeId]);
                }
              }
              // 2. Flat dot-notation key check
              const flatKey = `unreadCounts.${id}`;
              if (typeof data[flatKey] === 'number') {
                unreadForMe = Math.max(unreadForMe, data[flatKey]);
              }
              const safeFlatKey = `unreadCounts.${safeId}`;
              if (typeof data[safeFlatKey] === 'number') {
                unreadForMe = Math.max(unreadForMe, data[safeFlatKey]);
              }
            }

            // 3. Unread dot fallback if unread boolean is set but counter missing
            const lastSender = String(data.lastSenderId || '');
            const isMe = myIds.includes(lastSender);
            if (!isMe && data.lastMessageIsRead === false && unreadForMe === 0) {
              unreadForMe = 1;
            }

            // If user currently has this exact conversation open, unread count is 0
            if (currentOpenConversationId && currentOpenConversationId === docSnap.id) {
              unreadForMe = 0;
            }

            distinctUnreads[docSnap.id] = unreadForMe;
          });

          useCommunicationStore.getState().setUnreadCounts(distinctUnreads);
        },
        (err) => {
          console.warn('Global unread count listener notice:', err);
        }
      );

      return () => unsubscribe();
    } catch (e) {}
  }, [currentUid, myIds.join(','), orgId, token, currentOpenConversationId]);

  return <>{children}</>;
};

export default GlobalCommunicationSyncProvider;
