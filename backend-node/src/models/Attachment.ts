import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface AttachmentAttributes {
  id: number;
  fileName: string;
  fileUrl: string;
  fileType?: string;
  taskId?: number | null;
  projectId?: number | null;
  uploadedById: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AttachmentCreationAttributes extends Optional<AttachmentAttributes, 'id'> {}

export class Attachment extends Model<AttachmentAttributes, AttachmentCreationAttributes> implements AttachmentAttributes {
  declare id: number;
  declare fileName: string;
  declare fileUrl: string;
  declare fileType: string;
  declare taskId: number | null;
  declare projectId: number | null;
  declare uploadedById: number;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Attachment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fileUrl: {
      type: DataTypes.STRING(1024),
      allowNull: false,
    },
    fileType: DataTypes.STRING,
    taskId: DataTypes.INTEGER,
    projectId: DataTypes.INTEGER,
    uploadedById: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'attachments',
  }
);
