import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, NotificationController.getNotifications);
router.get('/unread', authenticateToken, NotificationController.getUnreadNotifications);
router.put('/:id/read', authenticateToken, NotificationController.markAsRead);
router.put('/read-all', authenticateToken, NotificationController.markAllAsRead);
router.post('/', authenticateToken, NotificationController.createNotification);

export default router;
