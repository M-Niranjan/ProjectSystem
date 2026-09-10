import { Router } from 'express';
import { MessageController } from '../controllers/messageController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/conversation/:contactId', authenticateToken, MessageController.getConversation);
router.post('/', authenticateToken, MessageController.sendMessage);
router.get('/unread', authenticateToken, MessageController.getUnread);

export default router;
