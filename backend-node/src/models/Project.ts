import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface ProjectAttributes {
  id: number;
  name: string;
  description?: string;
  status: string;
  priority: string;
  budget?: number;
  spent?: number;
  deadline?: string;
  isFavorite?: boolean;
  colorLabel?: string;
  ownerId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProjectCreationAttributes extends Optional<ProjectAttributes, 'id'> {}

export class Project extends Model<ProjectAttributes, ProjectCreationAttributes> implements ProjectAttributes {
  declare id: number;
  declare name: string;
  declare description: string;
  declare status: string;
  declare priority: string;
  declare budget: number;
  declare spent: number;
  declare deadline: string;
  declare isFavorite: boolean;
  declare colorLabel: string;
  declare ownerId: number;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Project.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: DataTypes.TEXT,
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'PLANNING',
    },
    priority: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'MEDIUM',
    },
    budget: DataTypes.FLOAT,
    spent: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
    },
    deadline: DataTypes.STRING,
    isFavorite: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    colorLabel: DataTypes.STRING,
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'projects',
  }
);
