import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';
import { resolveOrganization } from '../middleware/orgContext';

const router = Router();

router.use(authenticateToken);
router.use(resolveOrganization);

router.get('/', NotificationController.getNotifications);
router.get('/unread', NotificationController.getUnreadNotifications);
router.put('/read-all', NotificationController.markAllAsRead);

router.get('/preferences', NotificationController.getPreferences);
router.put('/preferences', NotificationController.updatePreferences);

router.post('/device-token', NotificationController.registerDeviceToken);
router.delete('/device-token', NotificationController.unregisterDeviceToken);

router.put('/:id/read', NotificationController.markAsRead);
router.put('/:id/unread', NotificationController.markAsUnread);
router.delete('/:id', NotificationController.deleteNotification);

router.post('/', NotificationController.createNotification);

export default router;
