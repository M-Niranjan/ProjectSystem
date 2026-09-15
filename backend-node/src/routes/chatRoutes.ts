import { Router } from 'express';
import { ChatController } from '../controllers/chatController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/project/:projectId', authenticateToken, ChatController.getProjectMessages);
router.post('/', authenticateToken, ChatController.sendMessage);

export default router;
