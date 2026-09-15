import { Router } from 'express';
import { TaskController } from '../controllers/taskController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, TaskController.getAllTasks);
router.get('/project/:projectId', authenticateToken, TaskController.getProjectTasks);
router.get('/:id', authenticateToken, TaskController.getTaskById);
router.post('/', authenticateToken, TaskController.createTask);
router.put('/:id', authenticateToken, TaskController.updateTask);
router.delete('/:id', authenticateToken, TaskController.deleteTask);

router.get('/:id/comments', authenticateToken, TaskController.getComments);
router.post('/:id/comments', authenticateToken, TaskController.addComment);

router.post('/:id/timer', authenticateToken, TaskController.updateTimer);
router.get('/:id/ai-subtasks', authenticateToken, TaskController.getAiSubtasks);

router.post('/:id/dependencies/:depId', authenticateToken, TaskController.addDependency);
router.delete('/:id/dependencies/:depId', authenticateToken, TaskController.removeDependency);

export default router;
