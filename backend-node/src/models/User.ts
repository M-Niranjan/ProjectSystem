import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum Role {
  ROLE_ADMIN = 'ROLE_ADMIN',
  ROLE_MANAGER = 'ROLE_MANAGER',
  ROLE_EMPLOYEE = 'ROLE_EMPLOYEE',
}

export interface UserAttributes {
  id: number;
  email: string;
  password?: string;
  name: string;
  role: Role;
  status?: string;
  designation?: string;
  department?: string;
  experience?: number;
  skills?: string;
  gender?: string;
  profilePhoto?: string;
  phone?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  bio?: string;
  education?: string;
  resumeBase64?: string;
  resumeFileName?: string;
  otp?: string | null;
  otpExpiresAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: number;
  declare email: string;
  declare password: string;
  declare name: string;
  declare role: Role;
  declare status: string;
  declare designation: string;
  declare department: string;
  declare experience: number;
  declare skills: string;
  declare gender: string;
  declare profilePhoto: string;
  declare phone: string;
  declare githubUrl: string;
  declare portfolioUrl: string;
  declare bio: string;
  declare education: string;
  declare resumeBase64: string;
  declare resumeFileName: string;
  declare otp: string | null;
  declare otpExpiresAt: Date | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(...Object.values(Role)),
      allowNull: false,
      defaultValue: Role.ROLE_EMPLOYEE,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'active',
    },
    designation: DataTypes.STRING,
    department: DataTypes.STRING,
    experience: DataTypes.INTEGER,
    skills: DataTypes.TEXT,
    gender: DataTypes.STRING,
    profilePhoto: DataTypes.TEXT,
    phone: DataTypes.STRING,
    githubUrl: DataTypes.STRING,
    portfolioUrl: DataTypes.STRING,
    bio: DataTypes.TEXT,
    education: DataTypes.TEXT,
    resumeBase64: DataTypes.TEXT,
    resumeFileName: DataTypes.STRING,
    otp: DataTypes.STRING,
    otpExpiresAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'users',
  }
);
