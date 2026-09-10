import { Response } from 'express';
import { Task, Project, User, Comment, Notification, DirectMessage, Role } from '../models';
import { AuthRequest } from '../middleware/auth';
import { AIService } from '../services/aiService';
import { Op } from 'sequelize';

export class TaskController {
  public static async getAllTasks(_req: AuthRequest, res: Response) {
    try {
      const tasks = await Task.findAll({
        include: [
          { model: Project, as: 'project' },
          { model: User, as: 'assignee', attributes: { exclude: ['password'] } },
          { model: User, as: 'creator', attributes: { exclude: ['password'] } },
          { model: User, as: 'reviewer', attributes: { exclude: ['password'] } },
        ],
        order: [['createdAt', 'DESC']],
      });
      return res.json(tasks);
    } catch (err: any) {
      console.error('Error in getAllTasks:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async getProjectTasks(req: AuthRequest, res: Response) {
    try {
      const projectId = parseInt(req.params.projectId);
      const tasks = await Task.findAll({
        where: { projectId },
        include: [
          { model: Project, as: 'project' },
          { model: User, as: 'assignee', attributes: { exclude: ['password'] } },
          { model: User, as: 'creator', attributes: { exclude: ['password'] } },
        ],
        order: [['createdAt', 'DESC']],
      });
      return res.json(tasks);
    } catch (err: any) {
      console.error('Error in getProjectTasks:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async getTaskById(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const task = await Task.findByPk(id, {
        include: [
          { model: Project, as: 'project' },
          { model: User, as: 'assignee', attributes: { exclude: ['password'] } },
          { model: User, as: 'creator', attributes: { exclude: ['password'] } },
          { model: Task, as: 'subtasks' },
          { model: Task, as: 'dependencies', through: { attributes: [] } },
        ],
      });
      if (!task) return res.status(404).send('Task not found');
      return res.json(task);
    } catch (err: any) {
      console.error('Error in getTaskById:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async createTask(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).send('Unauthorized');

      const creatorId = req.user.id;
      const { title, description, status, priority, dueDate, estimatedTime, projectId, assigneeId, parentId } = req.body;

      const resolvedProjectId = projectId || (req.body.project ? req.body.project.id : null);
      if (!resolvedProjectId) {
        return res.status(400).send('Project ID is required');
      }

      const project = await Project.findByPk(resolvedProjectId);
      if (!project) return res.status(404).send('Project not found');

      let taskPriority = priority;
      if (!taskPriority) {
        taskPriority = AIService.predictPriority(title, description);
      }

      let taskEstTime = estimatedTime;
      const resolvedAssigneeId = assigneeId || (req.body.assignee ? req.body.assignee.id : null);
      if (!taskEstTime || Number(taskEstTime) === 0) {
        let experience = 2;
        if (resolvedAssigneeId) {
          const assigneeUser = await User.findByPk(resolvedAssigneeId);
          if (assigneeUser) experience = assigneeUser.experience || 2;
        }
        taskEstTime = AIService.estimateDuration(title, description, experience);
      }

      let taskStatus = status || 'TO_DO';
      if (resolvedAssigneeId) {
        const assigneeUser = await User.findByPk(resolvedAssigneeId);
        if (assigneeUser && assigneeUser.role === Role.ROLE_EMPLOYEE && taskStatus !== 'COMPLETED') {
          taskStatus = 'PENDING_ACCEPTANCE';
        }
      }

      const task = await Task.create({
        title: title || 'New Task',
        description,
        status: taskStatus,
        priority: taskPriority,
        dueDate,
        estimatedTime: Number(taskEstTime || 0),
        actualTime: 0.0,
        projectId: resolvedProjectId,
        assigneeId: resolvedAssigneeId || null,
        creatorId,
        parentTaskId: parentId ? Number(parentId) : null,
      });

      if (resolvedAssigneeId) {
        const assigneeUser = await User.findByPk(resolvedAssigneeId);
        const creatorUser = await User.findByPk(creatorId);

        if (assigneeUser) {
          await Notification.create({
            title: 'Task Assigned',
            message: `You have been assigned: ${task.title}`,
            type: 'TASK_ASSIGNED',
            isRead: false,
            recipientId: assigneeUser.id,
          });

          await DirectMessage.create({
            content: `Hello, I have assigned you a new task: "${task.title}". Please review and accept it.`,
            senderId: creatorId,
            recipientId: assigneeUser.id,
            taskId: task.id,
            isRead: false,
          });
        }
      }

      const savedTask = await Task.findByPk(task.id, {
        include: [
          { model: Project, as: 'project' },
          { model: User, as: 'assignee', attributes: { exclude: ['password'] } },
          { model: User, as: 'creator', attributes: { exclude: ['password'] } },
        ],
      });

      return res.status(201).json(savedTask);
    } catch (err: any) {
      console.error('Error in createTask:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async updateTask(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).send('Unauthorized');

      const id = parseInt(req.params.id);
      const task = await Task.findByPk(id);
      if (!task) return res.status(404).send('Task not found');

      const currentUser = await User.findByPk(req.user.id);
      const isTeamLeader = req.user.role === Role.ROLE_ADMIN || req.user.role === Role.ROLE_MANAGER;

      if (!isTeamLeader && task.assigneeId !== req.user.id) {
        return res.status(403).send('Only the assigned member or Team Leader can update this task.');
      }

      const oldStatus = task.status;
      const oldAssigneeId = task.assigneeId;
      const incomingStatus = req.body.status;

      // Duplicate acceptance guard
      if ((incomingStatus === 'ACCEPTED' || incomingStatus === 'TO_DO') && oldStatus === 'ACCEPTED') {
        const assigneeObj = oldAssigneeId ? await User.findByPk(oldAssigneeId) : null;
        return res.status(400).send(`Task has already been accepted by ${assigneeObj ? assigneeObj.name : 'the assignee'}.`);
      }

      const { title, description, priority, dueDate, estimatedTime, actualTime, recurring, recurringPattern, declineReason, assignee, assigneeId } = req.body;

      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (incomingStatus !== undefined) task.status = incomingStatus;
      if (priority !== undefined) task.priority = priority;
      if (dueDate !== undefined) task.dueDate = dueDate;
      if (estimatedTime !== undefined) task.estimatedTime = Number(estimatedTime);
      if (actualTime !== undefined) task.actualTime = Number(actualTime);
      if (recurring !== undefined) task.recurring = recurring;
      if (recurringPattern !== undefined) task.recurringPattern = recurringPattern;
      if (declineReason !== undefined) task.declineReason = declineReason;

      if (incomingStatus === 'ACCEPTED' && oldStatus === 'PENDING_ACCEPTANCE') {
        task.acceptedAt = new Date();
      }

      const resolvedAssigneeId = assigneeId !== undefined ? assigneeId : (assignee ? assignee.id : undefined);

      if (resolvedAssigneeId !== undefined) {
        if (resolvedAssigneeId === null) {
          task.assigneeId = null;
        } else {
          const newAssignee = await User.findByPk(resolvedAssigneeId);
          if (newAssignee) {
            task.assigneeId = newAssignee.id;
            if (oldAssigneeId !== newAssignee.id) {
              if (newAssignee.role === Role.ROLE_EMPLOYEE && incomingStatus !== 'COMPLETED') {
                task.status = 'PENDING_ACCEPTANCE';
              }
              await Notification.create({
                title: 'Task Assigned',
                message: `You have been assigned: ${task.title}`,
                type: 'TASK_ASSIGNED',
                isRead: false,
                recipientId: newAssignee.id,
              });

              await DirectMessage.create({
                content: `Hello, I have assigned you a new task: "${task.title}". Please review and accept it.`,
                senderId: req.user.id,
                recipientId: newAssignee.id,
                taskId: task.id,
                isRead: false,
              });
            }
          }
        }
      }

      await task.save();

      // Notifications on state transition
      if (oldStatus === 'PENDING_ACCEPTANCE' && (task.status === 'ACCEPTED' || task.status === 'TO_DO') && oldAssigneeId) {
        // Auto-dismiss TASK_ASSIGNED notifications
        await Notification.update({ isRead: true }, {
          where: {
            recipientId: oldAssigneeId,
            type: 'TASK_ASSIGNED',
            message: { [Op.like]: `%${task.title}%` },
          },
        });

        const oldAssigneeObj = await User.findByPk(oldAssigneeId);
        await DirectMessage.create({
          content: `I have accepted the task: "${task.title}".`,
          senderId: oldAssigneeId,
          recipientId: task.creatorId,
          taskId: task.id,
          isRead: false,
        });

        await Notification.create({
          title: 'Task Accepted',
          message: `${oldAssigneeObj?.name || 'Assignee'} accepted: "${task.title}"`,
          type: 'TASK_ACCEPTED',
          isRead: false,
          recipientId: task.creatorId,
        });
      }

      if (oldStatus === 'PENDING_ACCEPTANCE' && (task.status === 'BACKLOG' || task.status === 'DECLINED') && oldAssigneeId) {
        const oldAssigneeObj = await User.findByPk(oldAssigneeId);
        let reason = declineReason || 'No reason provided.';
        if (!reason.startsWith(oldAssigneeObj?.name || '')) {
          reason = `${oldAssigneeObj?.name || 'Assignee'}: ${reason}`;
        }
        task.declineReason = reason;
        await task.save();

        await DirectMessage.create({
          content: `I have declined the task: "${task.title}". Reason: ${reason}`,
          senderId: oldAssigneeId,
          recipientId: task.creatorId,
          taskId: task.id,
          isRead: false,
        });

        await Notification.create({
          title: 'Task Declined',
          message: `${oldAssigneeObj?.name || 'Assignee'} declined: "${task.title}". Reason: ${reason}`,
          type: 'TASK_DECLINED',
          isRead: false,
          recipientId: task.creatorId,
        });
      }

      if (task.status === 'COMPLETED' && oldStatus !== 'COMPLETED') {
        await Notification.create({
          title: 'Task Completed',
          message: `The task: ${task.title} has been marked complete.`,
          type: 'TASK_COMPLETED',
          isRead: false,
          recipientId: task.creatorId,
        });
      }

      const updatedTask = await Task.findByPk(id, {
        include: [
          { model: Project, as: 'project' },
          { model: User, as: 'assignee', attributes: { exclude: ['password'] } },
          { model: User, as: 'creator', attributes: { exclude: ['password'] } },
        ],
      });

      return res.json(updatedTask);
    } catch (err: any) {
      console.error('Error in updateTask:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async deleteTask(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).send('Unauthorized');

      const id = parseInt(req.params.id);
      const task = await Task.findByPk(id);
      if (!task) return res.status(404).send('Task not found');

      if (req.user.role !== Role.ROLE_ADMIN && req.user.role !== Role.ROLE_MANAGER) {
        return res.status(403).send('Only Team Leaders can delete tasks.');
      }

      await task.destroy();
      return res.json({ success: true });
    } catch (err: any) {
      console.error('Error in deleteTask:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async getComments(req: AuthRequest, res: Response) {
    try {
      const taskId = parseInt(req.params.id);
      const comments = await Comment.findAll({
        where: { taskId },
        include: [{ model: User, as: 'user', attributes: { exclude: ['password'] } }],
        order: [['createdAt', 'ASC']],
      });
      return res.json(comments);
    } catch (err: any) {
      console.error('Error in getComments:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async addComment(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).send('Unauthorized');

      const taskId = parseInt(req.params.id);
      const { content } = req.body;

      const task = await Task.findByPk(taskId);
      if (!task) return res.status(404).send('Task not found');

      const comment = await Comment.create({
        content: content || '',
        taskId,
        userId: req.user.id,
      });

      if (task.assigneeId && task.assigneeId !== req.user.id) {
        await Notification.create({
          title: 'New Comment',
          message: `${req.user.name || 'User'} commented on: ${task.title}`,
          type: 'MENTION',
          isRead: false,
          recipientId: task.assigneeId,
        });
      }

      const fullComment = await Comment.findByPk(comment.id, {
        include: [{ model: User, as: 'user', attributes: { exclude: ['password'] } }],
      });

      return res.json(fullComment);
    } catch (err: any) {
      console.error('Error in addComment:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async updateTimer(req: AuthRequest, res: Response) {
    try {
      const taskId = parseInt(req.params.id);
      const additionalHours = parseFloat(String(req.query.additionalHours || req.body.additionalHours || 0));

      const task = await Task.findByPk(taskId);
      if (!task) return res.status(404).send('Task not found');

      task.actualTime = (task.actualTime || 0) + additionalHours;
      await task.save();

      const project = await Project.findByPk(task.projectId);
      if (project) {
        project.spent = (project.spent || 0) + additionalHours * 50.0;
        await project.save();
      }

      return res.json(task);
    } catch (err: any) {
      console.error('Error in updateTimer:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async getAiSubtasks(req: AuthRequest, res: Response) {
    try {
      const taskId = parseInt(req.params.id);
      const task = await Task.findByPk(taskId);
      if (!task) return res.status(404).send('Task not found');

      const suggestions = AIService.suggestSubtasks(task.title, task.description);
      return res.json(suggestions);
    } catch (err: any) {
      console.error('Error in getAiSubtasks:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async addDependency(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const depId = parseInt(req.params.depId);

      const task = await Task.findByPk(id);
      const dependency = await Task.findByPk(depId);

      if (!task || !dependency) return res.status(404).send('Task or Dependency not found');

      await (task as any).addDependency(dependency);

      const updatedTask = await Task.findByPk(id, {
        include: [{ model: Task, as: 'dependencies', through: { attributes: [] } }],
      });

      return res.json(updatedTask);
    } catch (err: any) {
      console.error('Error in addDependency:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async removeDependency(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const depId = parseInt(req.params.depId);

      const task = await Task.findByPk(id);
      const dependency = await Task.findByPk(depId);

      if (!task || !dependency) return res.status(404).send('Task or Dependency not found');

      await (task as any).removeDependency(dependency);

      const updatedTask = await Task.findByPk(id, {
        include: [{ model: Task, as: 'dependencies', through: { attributes: [] } }],
      });

      return res.json(updatedTask);
    } catch (err: any) {
      console.error('Error in removeDependency:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}
