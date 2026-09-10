import { Response } from 'express';
import { Attachment, User, Task, Project } from '../models';
import { AuthRequest } from '../middleware/auth';

export class AttachmentController {
  public static async uploadFile(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).send('Unauthorized');
      if (!req.file) return res.status(400).send('File is empty');

      const { taskId, projectId } = req.body;
      const file = req.file;

      const fileUrl = `http://localhost:8080/uploads/${file.filename}`;

      const attachment = await Attachment.create({
        fileName: file.originalname,
        fileUrl,
        fileType: file.mimetype,
        taskId: taskId ? Number(taskId) : null,
        projectId: projectId ? Number(projectId) : null,
        uploadedById: req.user.id,
      });

      const fullAttachment = await Attachment.findByPk(attachment.id, {
        include: [
          { model: User, as: 'uploadedBy', attributes: { exclude: ['password'] } },
        ],
      });

      return res.json(fullAttachment);
    } catch (err: any) {
      console.error('Error in uploadFile:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async getTaskAttachments(req: AuthRequest, res: Response) {
    try {
      const taskId = parseInt(req.params.taskId);
      const attachments = await Attachment.findAll({
        where: { taskId },
        include: [
          { model: User, as: 'uploadedBy', attributes: { exclude: ['password'] } },
        ],
      });
      return res.json(attachments);
    } catch (err: any) {
      console.error('Error in getTaskAttachments:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async getProjectAttachments(req: AuthRequest, res: Response) {
    try {
      const projectId = parseInt(req.params.projectId);
      const attachments = await Attachment.findAll({
        where: { projectId },
        include: [
          { model: User, as: 'uploadedBy', attributes: { exclude: ['password'] } },
        ],
      });
      return res.json(attachments);
    } catch (err: any) {
      console.error('Error in getProjectAttachments:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}
