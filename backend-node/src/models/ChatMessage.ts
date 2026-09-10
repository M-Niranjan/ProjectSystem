import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface ChatMessageAttributes {
  id: number;
  content: string;
  senderId: number;
  projectId: number;
  fileUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ChatMessageCreationAttributes extends Optional<ChatMessageAttributes, 'id'> {}

export class ChatMessage extends Model<ChatMessageAttributes, ChatMessageCreationAttributes> implements ChatMessageAttributes {
  declare id: number;
  declare content: string;
  declare senderId: number;
  declare projectId: number;
  declare fileUrl: string;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ChatMessage.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    content: DataTypes.TEXT,
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fileUrl: DataTypes.STRING,
  },
  {
    sequelize,
    tableName: 'chat_messages',
  }
);
