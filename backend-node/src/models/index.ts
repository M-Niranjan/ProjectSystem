import { User, Role } from './User';
import { Project } from './Project';
import { Task } from './Task';
import { Comment } from './Comment';
import { DirectMessage } from './DirectMessage';
import { ChatMessage } from './ChatMessage';
import { Notification } from './Notification';
import { Attachment } from './Attachment';
import { ActivityLog } from './ActivityLog';

// User <-> Project (Owner)
User.hasMany(Project, { foreignKey: 'ownerId', as: 'ownedProjects' });
Project.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// User <-> Project (Members Many-to-Many)
User.belongsToMany(Project, { through: { model: 'project_members', unique: false }, foreignKey: 'userId', otherKey: 'projectId', as: 'memberProjects' });
Project.belongsToMany(User, { through: { model: 'project_members', unique: false }, foreignKey: 'projectId', otherKey: 'userId', as: 'members' });

// Project <-> Task
Project.hasMany(Task, { foreignKey: 'projectId', as: 'tasks', onDelete: 'CASCADE' });
Task.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// Task <-> User (Assignee, Reviewer, Creator)
Task.belongsTo(User, { foreignKey: 'assigneeId', as: 'assignee' });
Task.belongsTo(User, { foreignKey: 'reviewerId', as: 'reviewer' });
Task.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });
User.hasMany(Task, { foreignKey: 'assigneeId', as: 'assignedTasks' });

// Task Self-referencing (Subtasks)
Task.belongsTo(Task, { foreignKey: 'parentTaskId', as: 'parentTask' });
Task.hasMany(Task, { foreignKey: 'parentTaskId', as: 'subtasks' });

// Task Dependencies Many-to-Many
Task.belongsToMany(Task, { through: 'task_dependencies', foreignKey: 'taskId', otherKey: 'dependencyId', as: 'dependencies' });

// Task <-> Comment <-> User
Task.hasMany(Comment, { foreignKey: 'taskId', as: 'comments', onDelete: 'CASCADE' });
Comment.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// DirectMessage <-> User (Sender & Recipient)
DirectMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
DirectMessage.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });
DirectMessage.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

// ChatMessage <-> User & Project
ChatMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
ChatMessage.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// Notification <-> User
Notification.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });

// Attachment <-> Task, Project, User
Attachment.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });
Attachment.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
Attachment.belongsTo(User, { foreignKey: 'uploadedById', as: 'uploadedBy' });

// ActivityLog <-> User, Project, Task
ActivityLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
ActivityLog.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
ActivityLog.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

export {
  User,
  Role,
  Project,
  Task,
  Comment,
  DirectMessage,
  ChatMessage,
  Notification,
  Attachment,
  ActivityLog,
};
