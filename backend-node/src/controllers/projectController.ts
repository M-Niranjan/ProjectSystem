import { Response } from 'express';
import { Project, User, Role } from '../models';
import { AuthRequest } from '../middleware/auth';
import { Op } from 'sequelize';

export class ProjectController {
  public static async getProjects(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).send('Unauthorized');

      const userId = req.user.id;
      const currentUser = await User.findByPk(userId);

      if (!currentUser) return res.status(404).send('User not found');

      // Fetch projects where user is owner or member
      const projects = await Project.findAll({
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
      });

      const fullProject = await Project.findByPk(project.id, {
        include: [
          { model: User, as: 'owner', attributes: { exclude: ['password'] } },
          { model: User, as: 'members', attributes: { exclude: ['password'] }, through: { attributes: [] } },
        ],
      });

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
