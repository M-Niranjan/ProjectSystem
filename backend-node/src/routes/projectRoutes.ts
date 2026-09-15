import { Router } from 'express';
import { ProjectController } from '../controllers/projectController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, ProjectController.getProjects);
router.get('/:id', authenticateToken, ProjectController.getProjectById);
router.post('/', authenticateToken, ProjectController.createProject);
router.put('/:id', authenticateToken, ProjectController.updateProject);
router.delete('/:id', authenticateToken, ProjectController.deleteProject);
router.put('/:id/favorite', authenticateToken, ProjectController.toggleFavorite);
router.post('/:id/members', authenticateToken, ProjectController.addMember);
router.delete('/:id/members/:userId', authenticateToken, ProjectController.removeMember);

export default router;
