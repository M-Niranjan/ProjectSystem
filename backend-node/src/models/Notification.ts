import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface NotificationAttributes {
  id: number;
  notificationId?: string;
  recipientId: number;
  recipientUid?: string;
  senderId?: string;
  senderName?: string;
  organizationId?: string;
  type: string;
  title: string;
  message: string;
  entityId?: string;
  entityType?: string;
  isRead?: boolean;
  priority?: string;
  actionUrl?: string;
  metadata?: string | null;
  eventId?: string | null;
  taskId?: number | null;
  projectId?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NotificationCreationAttributes extends Optional<NotificationAttributes, 'id'> {}

export class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> implements NotificationAttributes {
  declare id: number;
  declare notificationId: string;
  declare recipientId: number;
  declare recipientUid: string;
  declare senderId: string;
  declare senderName: string;
  declare organizationId: string;
  declare type: string;
  declare title: string;
  declare message: string;
  declare entityId: string;
  declare entityType: string;
  declare isRead: boolean;
  declare priority: string;
  declare actionUrl: string;
  declare metadata: string | null;
  declare eventId: string | null;
  declare taskId: number | null;
  declare projectId: number | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Notification.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    notificationId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    recipientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    recipientUid: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    senderId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    senderName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    organizationId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    entityId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'system',
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    priority: {
      type: DataTypes.STRING,
      defaultValue: 'MEDIUM',
    },
    actionUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    eventId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'notifications',
  }
);
