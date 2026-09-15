import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface DirectMessageAttributes {
  id: number;
  content: string;
  senderId: number;
  recipientId: number;
  taskId?: number | null;
  isRead?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DirectMessageCreationAttributes extends Optional<DirectMessageAttributes, 'id'> {}

export class DirectMessage extends Model<DirectMessageAttributes, DirectMessageCreationAttributes> implements DirectMessageAttributes {
  declare id: number;
  declare content: string;
  declare senderId: number;
  declare recipientId: number;
  declare taskId: number | null;
  declare isRead: boolean;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

DirectMessage.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    recipientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    taskId: DataTypes.INTEGER,
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'direct_messages',
  }
);
