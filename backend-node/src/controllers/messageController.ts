import { Response } from 'express';
import { DirectMessage, User, Task } from '../models';
import { AuthRequest } from '../middleware/auth';
import { Op } from 'sequelize';
import { firebaseFirestore } from '../config/firebaseAdmin';
import { NotificationService } from '../services/notificationService';

export class MessageController {
  /**
   * GET /api/messages/conversations/:conversationId/messages
   * Returns conversation-isolated messages strictly scoped by organizationId and conversationId.
   */
  public static async getConversationMessages(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

      const { conversationId } = req.params;
      if (!conversationId) {
        return res.status(400).json({ message: 'Conversation ID is required.' });
      }

      const orgId = req.organizationId || (req.user as any)?.organizationId || (req.headers['x-organization-id'] as string) || 'org_default';
      const callerUid = req.firebaseUid || String((req.user as any).uid || req.user.id);

      // Validate conversation participation for direct chats
      if (!conversationId.startsWith('ch_') && !conversationId.startsWith('team_') && !conversationId.startsWith('ai_')) {
        const participants = conversationId.split('_');
        const isParticipant = participants.some(p => p.toLowerCase() === callerUid.toLowerCase() || p === String(req.user?.id));
        const isAdminOrManager = req.user.role === 'ROLE_ADMIN' || req.user.role === 'ROLE_MANAGER';
        if (!isParticipant && !isAdminOrManager) {
          return res.status(403).json({ message: 'Access denied: You are not a participant in this conversation.' });
        }
      }

      if (firebaseFirestore) {
        let q: FirebaseFirestore.Query = firebaseFirestore.collection('messages')
          .where('conversationId', '==', conversationId)
          .where('organizationId', '==', orgId);

        const snap = await q.limit(100).get();
        const messages = snap.docs.map(d => ({ id: d.id, messageId: d.id, ...d.data() }));

        messages.sort((a: any, b: any) => {
          const tA = new Date(a.createdAt || a.timestamp || 0).getTime();
          const tB = new Date(b.createdAt || b.timestamp || 0).getTime();
          return tA - tB;
        });

        return res.json(messages);
      }

      return res.json([]);
    } catch (err: any) {
      console.error('Error in getConversationMessages:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async getConversation(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).send('Unauthorized');

      const currentUserId = req.user.id;
      const contactParam = req.params.contactId;
      const contactId = parseInt(contactParam);

      if (isNaN(contactId)) {
        // String UID: if Firestore is active, compute deterministic conversationId
        const callerUid = req.firebaseUid || String((req.user as any).uid || req.user.id);
        const convId = [callerUid, contactParam].sort().join('_');
        req.params.conversationId = convId;
        return MessageController.getConversationMessages(req, res);
      }

      const messages = await DirectMessage.findAll({
        where: {
          [Op.or]: [
            { senderId: currentUserId, recipientId: contactId },
            { senderId: contactId, recipientId: currentUserId },
          ],
        },
        include: [
          { model: User, as: 'sender', attributes: { exclude: ['password'] } },
          { model: User, as: 'recipient', attributes: { exclude: ['password'] } },
          { model: Task, as: 'task' },
        ],
        order: [['createdAt', 'ASC']],
      });

      // Mark messages received from contact as read
      await DirectMessage.update(
        { isRead: true },
        {
          where: {
            recipientId: currentUserId,
            senderId: contactId,
            isRead: false,
          },
        }
      );

      return res.json(messages);
    } catch (err: any) {
      console.error('Error in getConversation:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async sendMessage(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).send('Unauthorized');

      const senderId = req.user.id;
      const { content, recipient, recipientId, taskId } = req.body;

      const targetRecipientId = recipientId || (recipient ? recipient.id : null);
      if (!targetRecipientId) {
        return res.status(400).send('Recipient ID is required');
      }

      const dm = await DirectMessage.create({
        content: content || '',
        senderId,
        recipientId: targetRecipientId,
        taskId: taskId ? Number(taskId) : null,
        isRead: false,
      });

      const savedDm = await DirectMessage.findByPk(dm.id, {
        include: [
          { model: User, as: 'sender', attributes: { exclude: ['password'] } },
          { model: User, as: 'recipient', attributes: { exclude: ['password'] } },
          { model: Task, as: 'task' },
        ],
      });

      // Dispatch targeted notification to recipient
      const targetOrgId = req.organizationId || (req.headers['x-organization-id'] as string) || (req.user as any)?.organizationId || 'org_default';
      const senderName = req.user.name || 'User';

      // Check for mentions
      const mentionMatches = (content || '').match(/@([\w.-]+)/g);
      if (mentionMatches && mentionMatches.length > 0) {
        for (const match of mentionMatches) {
          const mentionName = match.replace('@', '').toLowerCase();
          const mentionedUser = await User.findOne({
            where: {
              name: { [Op.like]: `%${mentionName}%` }
            }
          });
          if (mentionedUser && mentionedUser.id !== req.user.id) {
            await NotificationService.sendNotification({
              recipientUid: (mentionedUser as any).uid || String(mentionedUser.id),
              recipientId: mentionedUser.id,
              recipientEmail: mentionedUser.email,
              senderUid: req.firebaseUid || String(req.user.id),
              senderName,
              organizationId: targetOrgId,
              type: 'MENTION',
              title: 'New Mention in Chat',
              message: `${senderName} mentioned you in a message: "${content.slice(0, 80)}"`,
              entityId: targetRecipientId,
              entityType: 'conversation',
              actionUrl: `/messages?contactId=${req.user.id}`,
            });
          }
        }
      }

      // Send Direct Message Notification
      await NotificationService.sendNotification({
        recipientId: targetRecipientId,
        senderUid: req.firebaseUid || String(req.user.id),
        senderName,
        organizationId: targetOrgId,
        type: 'NEW_MESSAGE',
        title: `New message from ${senderName}`,
        message: content ? (content.length > 100 ? `${content.slice(0, 97)}...` : content) : 'Sent an attachment',
        entityId: targetRecipientId,
        entityType: 'conversation',
        actionUrl: `/messages?contactId=${req.user.id}`,
      });

      return res.json(savedDm);
    } catch (err: any) {
      console.error('Error in sendMessage:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async getUnread(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).send('Unauthorized');

      const unread = await DirectMessage.findAll({
        where: {
          recipientId: req.user.id,
          isRead: false,
        },
        include: [
          { model: User, as: 'sender', attributes: { exclude: ['password'] } },
        ],
        order: [['createdAt', 'DESC']],
      });

      return res.json(unread);
    } catch (err: any) {
      console.error('Error in getUnread:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}
