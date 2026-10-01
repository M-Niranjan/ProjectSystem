import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';
import { resolveOrganization } from '../middleware/orgContext';

const router = Router();

router.use(authenticateToken);
router.use(resolveOrganization);

router.get('/', NotificationController.getNotifications);
router.get('/unread', NotificationController.getUnreadNotifications);
router.put('/:id/read', NotificationController.markAsRead);
router.put('/read-all', NotificationController.markAllAsRead);
router.post('/', NotificationController.createNotification);

export default router;
