import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { sequelize, connectDB } from './config/database';

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import projectRoutes from './routes/projectRoutes';
import taskRoutes from './routes/taskRoutes';
import teamRoutes from './routes/teamRoutes';
import messageRoutes from './routes/messageRoutes';
import chatRoutes from './routes/chatRoutes';
import notificationRoutes from './routes/notificationRoutes';
import reportRoutes from './routes/reportRoutes';
import adminRoutes from './routes/adminRoutes';
import attachmentRoutes from './routes/attachmentRoutes';
import { errorHandler } from './middleware/errorHandler';

import { seedInitialAdmin } from './scripts/seedAdmin';

const app = express();
const PORT = process.env.PORT || 8080;

// CORS setup supporting credentials and local dev origins
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl) or any origin in dev mode
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Register API routes matching exact Java Spring Boot path mappings
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/attachments', attachmentRoutes);

// Health check endpoint
app.get('/', (_req, res) => {
  res.json({ message: 'Project Management Node.js API Backend is active and running', status: 'OK' });
});

// Centralized error handler
app.use(errorHandler);

// Database sync
const initializeServer = async () => {
  try {
    await connectDB();
    await sequelize.sync();

    // Ensure all model columns exist non-destructively in SQLite tables
    try {
      const models = sequelize.models;
      for (const [_, model] of Object.entries(models)) {
        if ((model as any).tableName) {
          const tableName = (model as any).tableName;
          const [cols] = await sequelize.query(`PRAGMA table_info(${tableName});`);
          const existing = (cols as any[]).map((c: any) => c.name);
          const modelCols = Object.keys((model as any).rawAttributes);
          for (const col of modelCols) {
            if (!existing.includes(col)) {
              try {
                await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN ${col} TEXT;`);
                console.log(`Non-destructive schema sync: Added missing column ${col} to table ${tableName}`);
              } catch (_alterErr) {}
            }
          }
        }
      }
    } catch (_syncErr) {}

    await seedInitialAdmin();
    console.log('Database synced cleanly and initial Admin provisioned.');

    app.listen(PORT, () => {
      console.log(`Node.js Express Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
  }
};

initializeServer();
