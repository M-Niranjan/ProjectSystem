import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { TeamController } from '../controllers/teamController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Role } from '../models/User';

const router = Router();

router.get('/', authenticateToken, TeamController.getAllMembers);
router.post('/team-leaders', authenticateToken, requireRole(Role.ROLE_ADMIN), TeamController.createTeamLeader);
router.post('/employees', authenticateToken, requireRole(Role.ROLE_ADMIN, Role.ROLE_MANAGER), TeamController.createEmployee);

router.get('/:id', authenticateToken, UserController.getUserProfile);
router.put('/profile', authenticateToken, UserController.updateProfile);

export default router;
