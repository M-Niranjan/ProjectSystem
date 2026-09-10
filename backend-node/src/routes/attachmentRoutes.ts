import { Router } from 'express';
import { AttachmentController } from '../controllers/attachmentController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/upload', authenticateToken, upload.single('file'), AttachmentController.uploadFile);
router.get('/task/:taskId', authenticateToken, AttachmentController.getTaskAttachments);
router.get('/project/:projectId', authenticateToken, AttachmentController.getProjectAttachments);

export default router;
