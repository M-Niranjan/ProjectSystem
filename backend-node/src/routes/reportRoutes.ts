import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authenticateToken } from '../middleware/auth';
import { resolveOrganization } from '../middleware/orgContext';

const router = Router();

router.use(authenticateToken);
router.use(resolveOrganization);

router.get('/analytics', ReportController.getAnalytics);
router.get('/project/:projectId/pdf', ReportController.downloadPdfReport);
router.get('/project/:projectId/excel', ReportController.downloadExcelReport);

export default router;
