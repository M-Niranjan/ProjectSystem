import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/analytics', authenticateToken, ReportController.getAnalytics);
router.get('/project/:projectId/pdf', authenticateToken, ReportController.downloadPdfReport);
router.get('/project/:projectId/excel', authenticateToken, ReportController.downloadExcelReport);

export default router;
