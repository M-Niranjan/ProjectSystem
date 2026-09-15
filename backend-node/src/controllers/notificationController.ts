import { Response } from 'express';
import { Notification, User } from '../models';
import { AuthRequest } from '../middleware/auth';
import { EmailService } from '../services/emailService';

export class NotificationController {
  public static async getNotifications(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).send('Unauthorized');

      const notifications = await Notification.findAll({
        where: { recipientId: req.user.id },
        order: [['createdAt', 'DESC']],
      });
      return res.json(notifications);
    } catch (err: any) {
      console.error('Error in getNotifications:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async getUnreadNotifications(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).send('Unauthorized');

      const unread = await Notification.findAll({
        where: {
          recipientId: req.user.id,
          isRead: false,
        },
        order: [['createdAt', 'DESC']],
      });
      return res.json(unread);
    } catch (err: any) {
      console.error('Error in getUnreadNotifications:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async markAsRead(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).send('Unauthorized');

      const id = parseInt(req.params.id);
      const notification = await Notification.findByPk(id);

      if (!notification) return res.status(404).send('Notification not found');

      if (notification.recipientId !== req.user.id) {
        return res.status(403).send('Forbidden');
      }

      notification.isRead = true;
      await notification.save();

      return res.json(notification);
    } catch (err: any) {
      console.error('Error in markAsRead:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).send('Unauthorized');

      await Notification.update(
        { isRead: true },
        { where: { recipientId: req.user.id, isRead: false } }
      );

      return res.json({ success: true });
    } catch (err: any) {
      console.error('Error in markAllAsRead:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async createNotification(req: AuthRequest, res: Response) {
    try {
      const { title, message, type, recipientId } = req.body;

      let recipients: User[] = [];
      if (recipientId && String(recipientId) !== 'ALL') {
        const singleUser = await User.findByPk(Number(recipientId));
        recipients = singleUser ? [singleUser] : await User.findAll();
      } else {
        recipients = await User.findAll();
      }

      for (const recipient of recipients) {
        await Notification.create({
          title: title || 'Notification Alert',
          message: message || 'System update',
          type: type || 'SYSTEM_ALERT',
          isRead: false,
          recipientId: recipient.id,
        });

        if (recipient.email && recipient.email.includes('@')) {
          EmailService.sendEmailAlert(recipient.email, `[Project Workspace Alert] ${title}`, message || '');
        }
      }

      return res.json({ message: `Notifications dispatched to ${recipients.length} user(s).` });
    } catch (err: any) {
      console.error('Error in createNotification:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}
