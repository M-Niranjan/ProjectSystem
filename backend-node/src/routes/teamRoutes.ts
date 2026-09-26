import { Router } from 'express';
import { TeamController } from '../controllers/teamController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Role } from '../models/User';

const router = Router();

// Provisioning Routes
router.post('/create-team-leader', authenticateToken, requireRole(Role.ROLE_ADMIN), TeamController.createTeamLeader);
router.post('/create-employee', authenticateToken, requireRole(Role.ROLE_ADMIN, Role.ROLE_MANAGER), TeamController.createEmployee);
router.post('/', authenticateToken, requireRole(Role.ROLE_ADMIN, Role.ROLE_MANAGER), TeamController.createMember);

// Team Leader -> Invite Teammate Routes
router.get('/eligible-teammates', authenticateToken, requireRole(Role.ROLE_MANAGER, Role.ROLE_ADMIN), TeamController.getEligibleTeammates);
router.post('/invite-teammates', authenticateToken, requireRole(Role.ROLE_MANAGER, Role.ROLE_ADMIN), TeamController.inviteTeammates);
router.post('/invite', authenticateToken, requireRole(Role.ROLE_MANAGER, Role.ROLE_ADMIN), TeamController.inviteTeammates);
router.post('/remove-teammate', authenticateToken, requireRole(Role.ROLE_MANAGER, Role.ROLE_ADMIN), TeamController.removeTeammate);

router.get('/', authenticateToken, TeamController.getAllMembers);
router.put('/:id/role', authenticateToken, requireRole(Role.ROLE_ADMIN), TeamController.updateMemberRole);
router.put('/:id', authenticateToken, requireRole(Role.ROLE_ADMIN, Role.ROLE_MANAGER), TeamController.updateMemberDetails);
router.delete('/:id', authenticateToken, requireRole(Role.ROLE_ADMIN, Role.ROLE_MANAGER), TeamController.deleteMember);

export default router;
