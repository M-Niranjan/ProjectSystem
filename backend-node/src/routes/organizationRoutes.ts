import { Router } from 'express';
import { OrganizationController } from '../controllers/organizationController';
import { authenticateToken } from '../middleware/auth';
import { resolveOrganization } from '../middleware/orgContext';

const router = Router();

// Public: Register a brand new organization with its admin
router.post('/register', OrganizationController.registerOrganization);

// All protected organization routes require token authentication and membership context
router.use(authenticateToken);
router.use(resolveOrganization);

// Current user's organizations
router.get('/', OrganizationController.listMyOrganizations);

// Platform Admin: list all organizations
router.get('/all', OrganizationController.getAllOrganizations);

// Create new organization
router.post('/', OrganizationController.createOrganization);

// Switch active organization context
router.post('/switch', OrganizationController.switchOrganization);

// Specific organization details
router.get('/:id', OrganizationController.getOrganization);
router.put('/:id', OrganizationController.updateOrganization);

// Organization members
router.get('/:id/members', OrganizationController.getMembers);
router.post('/:id/members', OrganizationController.addMember);
router.delete('/:id/members/:memberId', OrganizationController.removeMember);

export default router;
