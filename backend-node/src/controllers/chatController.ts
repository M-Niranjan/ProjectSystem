import { Response } from 'express';
import { ChatMessage, User, Project } from '../models';
import { AuthRequest } from '../middleware/auth';

export class ChatController {
  public static async getProjectMessages(req: AuthRequest, res: Response) {
    try {
      const projectId = parseInt(req.params.projectId);
      const messages = await ChatMessage.findAll({
        where: { projectId },
        include: [
          { model: User, as: 'sender', attributes: { exclude: ['password'] } },
          { model: Project, as: 'project' },
        ],
        order: [['createdAt', 'ASC']],
      });
      return res.json(messages);
    } catch (err: any) {
      console.error('Error in getProjectMessages:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async sendMessage(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).send('Unauthorized');

      const { content, project, projectId, fileUrl } = req.body;
      const targetProjectId = projectId || (project ? project.id : null);

      if (!targetProjectId) {
        return res.status(400).send('Project ID is required');
      }

      const msg = await ChatMessage.create({
        content: content || '',
        senderId: req.user.id,
        projectId: targetProjectId,
        fileUrl,
      });

      const savedMsg = await ChatMessage.findByPk(msg.id, {
        include: [
          { model: User, as: 'sender', attributes: { exclude: ['password'] } },
          { model: Project, as: 'project' },
        ],
      });

      return res.json(savedMsg);
    } catch (err: any) {
      console.error('Error in sendMessage:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}
