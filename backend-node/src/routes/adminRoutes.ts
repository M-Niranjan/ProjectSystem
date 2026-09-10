import { Router } from 'express';
import { TeamController } from '../controllers/teamController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Role } from '../models/User';

const router = Router();

// Admin provisioning routes
router.post('/create-team-leader', authenticateToken, requireRole(Role.ROLE_ADMIN), TeamController.createTeamLeader);
router.post('/create-employee', authenticateToken, requireRole(Role.ROLE_ADMIN, Role.ROLE_MANAGER), TeamController.createEmployee);

export default router;
