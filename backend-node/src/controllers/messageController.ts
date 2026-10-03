import { Response } from 'express';
import { DirectMessage, User, Task } from '../models';
import { AuthRequest } from '../middleware/auth';
import { Op } from 'sequelize';
import { firebaseFirestore } from '../config/firebaseAdmin';

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

      const orgId = req.organizationId || (req.user as any).organizationId;
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
          .where('conversationId', '==', conversationId);

        if (orgId) {
          q = q.where('organizationId', '==', orgId);
        }

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
