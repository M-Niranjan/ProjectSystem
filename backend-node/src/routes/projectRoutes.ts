import { Router } from 'express';
import { ProjectController } from '../controllers/projectController';
import { authenticateToken } from '../middleware/auth';
import { resolveOrganization } from '../middleware/orgContext';

const router = Router();

router.use(authenticateToken);
router.use(resolveOrganization);

router.get('/', ProjectController.getProjects);
router.get('/:id', ProjectController.getProjectById);
router.post('/', ProjectController.createProject);
router.put('/:id', ProjectController.updateProject);
router.delete('/:id', ProjectController.deleteProject);
router.put('/:id/favorite', ProjectController.toggleFavorite);
router.post('/:id/members', ProjectController.addMember);
router.delete('/:id/members/:userId', ProjectController.removeMember);

export default router;
