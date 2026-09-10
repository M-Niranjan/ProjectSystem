import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface TaskAttributes {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  estimatedTime?: number;
  actualTime?: number;
  projectId: number;
  assigneeId?: number | null;
  reviewerId?: number | null;
  creatorId: number;
  parentTaskId?: number | null;
  recurring?: boolean;
  recurringPattern?: string;
  declineReason?: string;
  acceptedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TaskCreationAttributes extends Optional<TaskAttributes, 'id'> {}

export class Task extends Model<TaskAttributes, TaskCreationAttributes> implements TaskAttributes {
  declare id: number;
  declare title: string;
  declare description: string;
  declare status: string;
  declare priority: string;
  declare dueDate: string;
  declare estimatedTime: number;
  declare actualTime: number;
  declare projectId: number;
  declare assigneeId: number | null;
  declare reviewerId: number | null;
  declare creatorId: number;
  declare parentTaskId: number | null;
  declare recurring: boolean;
  declare recurringPattern: string;
  declare declineReason: string;
  declare acceptedAt: Date | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Task.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: DataTypes.TEXT,
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'TO_DO',
    },
    priority: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'MEDIUM',
    },
    dueDate: DataTypes.STRING,
    estimatedTime: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
    },
    actualTime: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    assigneeId: DataTypes.INTEGER,
    reviewerId: DataTypes.INTEGER,
    creatorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    parentTaskId: DataTypes.INTEGER,
    recurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    recurringPattern: DataTypes.STRING,
    declineReason: DataTypes.TEXT,
    acceptedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'tasks',
  }
);
