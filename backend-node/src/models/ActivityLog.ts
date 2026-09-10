import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface ActivityLogAttributes {
  id: number;
  action: string;
  details?: string;
  userId: number;
  projectId?: number | null;
  taskId?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ActivityLogCreationAttributes extends Optional<ActivityLogAttributes, 'id'> {}

export class ActivityLog extends Model<ActivityLogAttributes, ActivityLogCreationAttributes> implements ActivityLogAttributes {
  declare id: number;
  declare action: string;
  declare details: string;
  declare userId: number;
  declare projectId: number | null;
  declare taskId: number | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ActivityLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    details: DataTypes.TEXT,
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    projectId: DataTypes.INTEGER,
    taskId: DataTypes.INTEGER,
  },
  {
    sequelize,
    tableName: 'activity_logs',
  }
);
