import { Response } from 'express';
import { Project, User, Role } from '../models';
import { AuthRequest } from '../middleware/auth';
import { Op } from 'sequelize';
import { FirebaseAdminService } from '../config/firebaseAdmin';
import { NotificationService } from '../services/notificationService';

export class ProjectController {
  public static async getProjects(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).send('Unauthorized');

      const userId = req.user.id;
      const currentUser = await User.findByPk(userId);

      if (!currentUser) return res.status(404).send('User not found');

      // Fetch projects scoped to active organization
      const targetOrgId = req.organizationId || (req.headers['x-organization-id'] as string);
      const whereClause: any = {};
      if (targetOrgId) {
        whereClause.organizationId = targetOrgId;
      }

      const projects = await Project.findAll({
        where: whereClause,
        include: [
          { model: User, as: 'owner', attributes: { exclude: ['password'] } },
          { model: User, as: 'members', attributes: { exclude: ['password'] }, through: { attributes: [] } },
        ],
        order: [['createdAt', 'DESC']],
      });

      // Filter accessible projects
      const userProjects = projects.filter((p) => {
        const isOwner = p.ownerId === userId;
        const isMember = (p as any).members?.some((m: any) => m.id === userId);
        return isOwner || isMember || req.user?.role === Role.ROLE_ADMIN;
      });

      return res.json(userProjects);
    } catch (err: any) {
      console.error('Error in getProjects:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async getProjectById(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).send('Unauthorized');

      const id = parseInt(req.params.id);
      const project = await Project.findByPk(id, {
        include: [
          { model: User, as: 'owner', attributes: { exclude: ['password'] } },
          { model: User, as: 'members', attributes: { exclude: ['password'] }, through: { attributes: [] } },
        ],
      });

      if (!project) {
        return res.status(404).send('Project not found');
      }

      const targetOrgId = req.organizationId || (req.headers['x-organization-id'] as string);
      if (targetOrgId && project.organizationId && project.organizationId !== targetOrgId && req.user.role !== Role.ROLE_ADMIN) {
        return res.status(403).send('Forbidden: Project belongs to another organization.');
      }

      const isOwner = project.ownerId === req.user.id;
      const isMember = (project as any).members?.some((m: any) => m.id === req.user?.id);

      if (!isOwner && !isMember && req.user.role !== Role.ROLE_ADMIN) {
        return res.status(403).send('Forbidden');
      }

      return res.json(project);
    } catch (err: any) {
      console.error('Error in getProjectById:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async createProject(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).send('Unauthorized');

      if (req.user.role === Role.ROLE_EMPLOYEE) {
        return res.status(403).send('Employees cannot create projects');
      }

      const targetOrgId = req.organizationId || (req.headers['x-organization-id'] as string) || 'org_default';
      const { name, description, status, priority, budget, spent, deadline, colorLabel } = req.body;

      const project = await Project.create({
        name: name || 'New Project',
        description,
        status: status || 'PLANNING',
        priority: priority || 'MEDIUM',
        budget: budget ? Number(budget) : 0,
        spent: spent ? Number(spent) : 0,
        deadline,
        colorLabel,
        ownerId: req.user.id,
        organizationId: targetOrgId,
      });

      const fullProject = await Project.findByPk(project.id, {
        include: [
          { model: User, as: 'owner', attributes: { exclude: ['password'] } },
          { model: User, as: 'members', attributes: { exclude: ['password'] }, through: { attributes: [] } },
        ],
      });

      // Synchronize and persist directly to Firebase Firestore
      try {
        await FirebaseAdminService.createFirestoreProject(project.id, {
          id: String(project.id),
          name: project.name,
          description: project.description,
          status: project.status,
          priority: project.priority,
          budget: project.budget,
          spent: project.spent,
          deadline: project.deadline,
          colorLabel: project.colorLabel,
          ownerId: project.ownerId,
          organizationId: project.organizationId,
          owner: (fullProject as any)?.owner ? { id: (fullProject as any).owner.id, name: (fullProject as any).owner.name, email: (fullProject as any).owner.email } : null,
          createdAt: project.createdAt,
        });

        await FirebaseAdminService.createFirestoreAuditLog({
          user: req.user?.name || 'Administrator',
          action: 'PROJECT_CREATED',
          activity: `${req.user?.name || 'Admin'} created Project ${project.name}`,
          status: 'VERIFIED',
          organizationId: targetOrgId,
          userId: req.user?.id,
        });
      } catch (fErr) {
        console.warn('Firestore project sync warning:', fErr);
      }

      return res.status(201).json(fullProject);
    } catch (err: any) {
      console.error('Error in createProject:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async updateProject(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).send('Unauthorized');

      const id = parseInt(req.params.id);
      const project = await Project.findByPk(id);

      if (!project) return res.status(404).send('Project not found');

      if (project.ownerId !== req.user.id && req.user.role !== Role.ROLE_ADMIN) {
        return res.status(403).send('Only owner can update project');
      }

      const { name, description, status, priority, budget, spent, deadline, colorLabel } = req.body;

      if (name !== undefined) project.name = name;
      if (description !== undefined) project.description = description;
      if (status !== undefined) project.status = status;
      if (priority !== undefined) project.priority = priority;
      if (budget !== undefined) project.budget = Number(budget);
      if (spent !== undefined) project.spent = Number(spent);
      if (deadline !== undefined) project.deadline = deadline;
      if (colorLabel !== undefined) project.colorLabel = colorLabel;

      await project.save();

      const updatedProject = await Project.findByPk(id, {
        include: [
          { model: User, as: 'owner', attributes: { exclude: ['password'] } },
          { model: User, as: 'members', attributes: { exclude: ['password'] }, through: { attributes: [] } },
        ],
      });

      // Synchronize update to Firebase Firestore
      try {
        await FirebaseAdminService.updateFirestoreProject(id, {
          name: project.name,
          description: project.description,
          status: project.status,
          priority: project.priority,
          budget: project.budget,
          spent: project.spent,
          deadline: project.deadline,
          colorLabel: project.colorLabel,
        });
      } catch (fErr) {
        console.warn('Firestore project update warning:', fErr);
      }

      return res.json(updatedProject);
    } catch (err: any) {
      console.error('Error in updateProject:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async deleteProject(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).send('Unauthorized');

      const id = parseInt(req.params.id);
      const project = await Project.findByPk(id);

      if (!project) return res.status(404).send('Project not found');

      if (project.ownerId !== req.user.id && req.user.role !== Role.ROLE_ADMIN) {
        return res.status(403).send('Only owner can delete project');
      }

      await project.destroy();

      // Synchronize deletion in Firebase Firestore
      try {
        await FirebaseAdminService.deleteFirestoreProject(id);
      } catch (fErr) {
        console.warn('Firestore project deletion warning:', fErr);
      }

      return res.json({ success: true });
    } catch (err: any) {
      console.error('Error in deleteProject:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async toggleFavorite(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const project = await Project.findByPk(id);

      if (!project) return res.status(404).send('Project not found');

      project.isFavorite = !project.isFavorite;
      await project.save();

      return res.json(project);
    } catch (err: any) {
      console.error('Error in toggleFavorite:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async addMember(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).send('Unauthorized');

      const id = parseInt(req.params.id);
      const { email } = req.query;

      const project = await Project.findByPk(id);
      if (!project) return res.status(404).send('Project not found');

      if (project.ownerId !== req.user.id && req.user.role !== Role.ROLE_ADMIN) {
        return res.status(403).send('Only owner can add members');
      }

      const userToAdd = await User.findOne({ where: { email: String(email).trim().toLowerCase() } });
      if (!userToAdd) return res.status(404).send(`User not found with email: ${email}`);

      await (project as any).addMember(userToAdd);

      // Targeted notification to added member
      const targetOrgId = project.organizationId || req.organizationId || 'org_default';
      await NotificationService.sendNotification({
        recipientUid: (userToAdd as any).uid || String(userToAdd.id),
        recipientId: userToAdd.id,
        recipientEmail: userToAdd.email,
        senderUid: req.firebaseUid || String(req.user.id),
        senderName: req.user.name || 'Project Lead',
        organizationId: targetOrgId,
        type: 'PROJECT_MEMBER_ADDED',
        title: 'Added to Project',
        message: `You have been added to project "${project.name}" by ${req.user.name || 'Project Lead'}.`,
        entityId: project.id,
        entityType: 'project',
        projectId: project.id,
        actionUrl: `/projects?projectId=${project.id}`,
        eventId: `PROJECT_${project.id}_MEMBER_ADD_${userToAdd.id}`,
      });

      const updatedProject = await Project.findByPk(id, {
        include: [
          { model: User, as: 'owner', attributes: { exclude: ['password'] } },
          { model: User, as: 'members', attributes: { exclude: ['password'] }, through: { attributes: [] } },
        ],
      });

      return res.json(updatedProject);
    } catch (err: any) {
      console.error('Error in addMember:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async removeMember(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).send('Unauthorized');

      const id = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);

      const project = await Project.findByPk(id);
      if (!project) return res.status(404).send('Project not found');

      if (project.ownerId !== req.user.id && req.user.role !== Role.ROLE_ADMIN) {
        return res.status(403).send('Only owner can remove members');
      }

      const userToRemove = await User.findByPk(userId);
      if (!userToRemove) return res.status(404).send(`User not found with ID: ${userId}`);

      await (project as any).removeMember(userToRemove);

      // Targeted notification to removed member
      const targetOrgId = project.organizationId || req.organizationId || 'org_default';
      await NotificationService.sendNotification({
        recipientUid: (userToRemove as any).uid || String(userToRemove.id),
        recipientId: userToRemove.id,
        recipientEmail: userToRemove.email,
        senderUid: req.firebaseUid || String(req.user.id),
        senderName: req.user.name || 'Project Lead',
        organizationId: targetOrgId,
        type: 'PROJECT_MEMBER_REMOVED',
        title: 'Removed from Project',
        message: `You were removed from project "${project.name}".`,
        entityId: project.id,
        entityType: 'project',
        projectId: project.id,
        actionUrl: `/projects`,
        eventId: `PROJECT_${project.id}_MEMBER_REM_${userToRemove.id}`,
      });

      const updatedProject = await Project.findByPk(id, {
        include: [
          { model: User, as: 'owner', attributes: { exclude: ['password'] } },
          { model: User, as: 'members', attributes: { exclude: ['password'] }, through: { attributes: [] } },
        ],
      });

      return res.json(updatedProject);
    } catch (err: any) {
      console.error('Error in removeMember:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}
