import { Response } from 'express';
import { DirectMessage, User, Task } from '../models';
import { AuthRequest } from '../middleware/auth';
import { Op } from 'sequelize';

export class MessageController {
  public static async getConversation(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).send('Unauthorized');

      const currentUserId = req.user.id;
      const contactId = parseInt(req.params.contactId);

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
