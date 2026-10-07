import crypto from 'crypto';
import { Notification, User } from '../models';
import { FirebaseAdminService } from '../config/firebaseAdmin';
import { EmailService } from '../services/emailService';

export interface SendNotificationOptions {
  recipientUid?: string;
  recipientId?: number | string;
  recipientEmail?: string;
  senderUid?: string;
  senderName?: string;
  organizationId: string;
  type: string;
  title: string;
  message: string;
  entityId?: string | number;
  entityType?: 'task' | 'project' | 'conversation' | 'team' | 'document' | 'approval' | 'security' | 'system';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  actionUrl?: string;
  metadata?: Record<string, any>;
  eventId?: string;
  taskId?: number;
  projectId?: number;
  skipPush?: boolean;
  skipEmail?: boolean;
}

// In-memory idempotency cache with TTL to prevent race-condition duplicates
const recentEventsCache = new Map<string, { timestamp: number; notificationId: string }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cleanOldEvents() {
  const now = Date.now();
  for (const [key, value] of recentEventsCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      recentEventsCache.delete(key);
    }
  }
}
setInterval(cleanOldEvents, 60 * 1000);

export class NotificationService {
  /**
   * Dispatches a single targeted notification to an exact recipient with:
   * 1. Strict Organization Isolation
   * 2. Idempotency / Duplicate Prevention
   * 3. Persistent Storage (Firestore + SQLite)
   * 4. Android / Web FCM Push Notification
   * 5. User Notification Preferences Check
   */
  public static async sendNotification(options: SendNotificationOptions) {
    try {
      const {
        recipientUid: rawRecipientUid,
        recipientId: rawRecipientId,
        recipientEmail: rawRecipientEmail,
        senderUid = 'SYSTEM',
        senderName = 'System',
        organizationId,
        type,
        title,
        message,
        entityId,
        entityType = 'system',
        priority = 'MEDIUM',
        actionUrl,
        metadata,
        eventId,
        taskId,
        projectId,
        skipPush = false,
        skipEmail = false,
      } = options;

      if (!organizationId) {
        console.warn('⚠️ [NotificationService] Blocked notification dispatch: Missing organizationId.');
        return null;
      }

      // Step 1: Resolve Recipient Firebase UID, SQL ID, and Email
      let resolvedUid: string | null = null;
      let resolvedSqlId: number = 0;
      let resolvedEmail: string | null = rawRecipientEmail || null;

      if (rawRecipientUid && typeof rawRecipientUid === 'string' && rawRecipientUid.trim()) {
        resolvedUid = rawRecipientUid.trim();
      }

      if (rawRecipientId && !resolvedUid) {
        if (typeof rawRecipientId === 'string' && (rawRecipientId.length > 15 || isNaN(Number(rawRecipientId)))) {
          resolvedUid = rawRecipientId.trim();
        } else {
          resolvedSqlId = Number(rawRecipientId);
        }
      }

      // Query User table / Firestore to bridge UID and SQL ID
      if (resolvedUid && (!resolvedSqlId || !resolvedEmail)) {
        try {
          const sqlUser = await User.findOne({
            where: { email: rawRecipientEmail || '' },
          }).catch(() => null);

          if (sqlUser) {
            resolvedSqlId = sqlUser.id;
            resolvedEmail = sqlUser.email;
          } else {
            const fsUser = await FirebaseAdminService.getFirestoreUserDoc(resolvedUid);
            if (fsUser) {
              resolvedEmail = fsUser.email || resolvedEmail;
              if (fsUser.email) {
                const userByEmail = await User.findOne({ where: { email: fsUser.email.toLowerCase() } }).catch(() => null);
                if (userByEmail) resolvedSqlId = userByEmail.id;
              }
            }
          }
        } catch (_lookupErr) {}
      } else if (resolvedSqlId && !resolvedUid) {
        try {
          const sqlUser = await User.findByPk(resolvedSqlId);
          if (sqlUser) {
            resolvedEmail = sqlUser.email;
            const fsUser = await FirebaseAdminService.getUserByEmailFromFirestore(sqlUser.email);
            if (fsUser?.uid) {
              resolvedUid = fsUser.uid;
            }
          }
        } catch (_lookupErr) {}
      }

      if (!resolvedUid && !resolvedSqlId) {
        console.warn('⚠️ [NotificationService] Blocked notification dispatch: Could not resolve recipient identity.');
        return null;
      }

      const finalRecipientUid = resolvedUid || `usr_${resolvedSqlId}`;

      // Step 2: Idempotency & Duplicate Prevention
      const idempotencyKey = eventId || `${type}_${organizationId}_${finalRecipientUid}_${entityType}_${entityId || 'none'}_${Math.floor(Date.now() / 10000)}`;
      if (recentEventsCache.has(idempotencyKey)) {
        const cached = recentEventsCache.get(idempotencyKey);
        console.log(`ℹ️ [NotificationService] Suppressed duplicate notification event: ${idempotencyKey}`);
        return { notificationId: cached?.notificationId, duplicate: true };
      }

      // Step 3: Check User Notification Preferences
      const preferences = await FirebaseAdminService.getUserNotificationPreferences(finalRecipientUid);
      const categoryKey = NotificationService.mapTypeToCategory(type);
      const categoryPref = preferences?.categories?.[categoryKey] || { inApp: true, push: true, email: true };

      const allowInApp = categoryPref.inApp !== false && preferences?.inApp !== false;
      const allowPush = !skipPush && categoryPref.push !== false && preferences?.push !== false;
      const allowEmail = !skipEmail && categoryPref.email === true && preferences?.email === true;

      // Step 4: Generate unique Notification ID
      const notificationId = `notif_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      recentEventsCache.set(idempotencyKey, { timestamp: Date.now(), notificationId });

      const stringifiedMetadata = metadata ? JSON.stringify(metadata) : null;

      // Step 5: Save Persistent Notification in Firestore
      const firestorePayload = {
        id: notificationId,
        notificationId,
        recipientId: finalRecipientUid,
        recipientUid: finalRecipientUid,
        senderId: senderUid,
        senderName,
        organizationId,
        type,
        title,
        message,
        entityId: entityId ? String(entityId) : null,
        entityType,
        priority,
        actionUrl: actionUrl || NotificationService.getDefaultActionUrl(entityType, entityId),
        metadata: metadata || null,
        eventId: idempotencyKey,
        taskId: taskId || (entityType === 'task' && !isNaN(Number(entityId)) ? Number(entityId) : null),
        projectId: projectId || (entityType === 'project' && !isNaN(Number(entityId)) ? Number(entityId) : null),
        isRead: false,
      };

      await FirebaseAdminService.createFirestoreNotification(notificationId, firestorePayload);

      // Step 6: Save Relational Notification in SQLite
      let sqlNotificationId = 0;
      try {
        const sqlRecord = await Notification.create({
          notificationId,
          recipientId: resolvedSqlId || 0,
          recipientUid: finalRecipientUid,
          senderId: senderUid,
          senderName,
          organizationId,
          type,
          title,
          message,
          entityId: entityId ? String(entityId) : undefined,
          entityType,
          priority,
          actionUrl: firestorePayload.actionUrl || undefined,
          metadata: stringifiedMetadata,
          eventId: idempotencyKey,
          taskId: firestorePayload.taskId,
          projectId: firestorePayload.projectId,
          isRead: false,
        });
        sqlNotificationId = sqlRecord.id;
      } catch (sqlErr) {
        console.warn('SQLite notification sync warning (non-fatal):', sqlErr);
      }

      // Step 7: Android / Web FCM Push Notification Dispatch
      if (allowPush) {
        try {
          const deviceTokens = await FirebaseAdminService.getUserDeviceTokens(finalRecipientUid, organizationId);
          if (deviceTokens.length > 0) {
            await FirebaseAdminService.sendMulticastPushNotification(
              deviceTokens,
              {
                title,
                body: message,
              },
              {
                notificationId,
                organizationId,
                type,
                entityId: entityId ? String(entityId) : '',
                entityType,
                actionUrl: firestorePayload.actionUrl || '',
                priority,
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
              }
            );
          }
        } catch (pushErr) {
          console.warn('FCM Push notification warning (non-fatal):', pushErr);
        }
      }

      // Step 8: Email Notification Dispatch
      if (allowEmail && resolvedEmail && resolvedEmail.includes('@')) {
        try {
          EmailService.sendEmailAlert(
            resolvedEmail,
            `[${organizationId.toUpperCase()}] ${title}`,
            message
          );
        } catch (emailErr) {
          console.warn('Email notification warning (non-fatal):', emailErr);
        }
      }

      console.log(`🔔 [NotificationService] Notification dispatched:
  ID:             ${notificationId} (SQL: ${sqlNotificationId})
  Recipient:      ${finalRecipientUid} (${resolvedEmail || 'no-email'})
  Sender:         ${senderName} (${senderUid})
  Organization:   ${organizationId}
  Type:           ${type}
  Title:          ${title}`);

      return {
        notificationId,
        sqlId: sqlNotificationId,
        recipientUid: finalRecipientUid,
        organizationId,
      };
    } catch (err) {
      console.error('Error in NotificationService.sendNotification:', err);
      return null;
    }
  }

  /**
   * Dispatches notifications to a targeted list of recipient UIDs (e.g. team members or project members).
   * Ensures no broadcast to unrelated employees.
   */
  public static async sendBatchNotifications(
    recipientUids: string[],
    baseOptions: Omit<SendNotificationOptions, 'recipientUid' | 'recipientId'>
  ) {
    if (!recipientUids || recipientUids.length === 0) return [];
    const uniqueUids = Array.from(new Set(recipientUids.filter(u => u && u.trim().length > 0)));

    const results = [];
    for (const uid of uniqueUids) {
      // Exclude sender from receiving their own trigger event unless explicit
      if (baseOptions.senderUid && uid === baseOptions.senderUid) {
        continue;
      }
      const res = await this.sendNotification({
        ...baseOptions,
        recipientUid: uid,
      });
      if (res) results.push(res);
    }
    return results;
  }

  private static mapTypeToCategory(type: string): string {
    const t = (type || '').toUpperCase();
    if (t.startsWith('TASK_') || t.includes('STEP_') || t.includes('CHANGES_')) return 'tasks';
    if (t.startsWith('PROJECT_')) return 'projects';
    if (t.includes('MESSAGE') || t.includes('CHAT') || t.includes('COMMUNICATION')) return 'communication';
    if (t.includes('MENTION')) return 'mentions';
    if (t.includes('SECURITY') || t.includes('LOGIN') || t.includes('PASSWORD')) return 'security';
    if (t.includes('APPROVAL') || t.includes('SUBMITTED')) return 'approvals';
    return 'tasks';
  }

  private static getDefaultActionUrl(entityType: string, entityId?: string | number): string {
    if (!entityId) return '/';
    switch (entityType) {
      case 'task':
        return `/tasks?taskId=${entityId}`;
      case 'project':
        return `/projects?projectId=${entityId}`;
      case 'conversation':
        return `/messages?conversationId=${entityId}`;
      case 'document':
        return `/step-verification?taskId=${entityId}`;
      case 'security':
        return '/settings';
      default:
        return '/';
    }
  }
}
