# Deployment Guide for Project Management System

This guide explains how to deploy the **Project Management System** (React Frontend + Node.js Express Backend + Firebase Authentication + Cloud Firestore) to **Vercel**, **Netlify**, **Render**, or **Railway**.

---

## Architecture Overview

- **Frontend (`frontend/`)**: React 19 + TypeScript + Vite Single-Page Web Application.
- **Backend (`backend-node/`)**: Node.js + Express REST API with Firebase Admin SDK.
- **Database (`Cloud Firestore`)**: User profiles, roles, and application state.
- **Auth (`Firebase Auth`)**: User identity and credential management.

---

## Option 1: Deploy Frontend to Vercel

1. Log in to [Vercel](https://vercel.com/) and click **Add New -> Project**.
2. Import your GitHub repository (`ProjectSystem`).
3. Set the **Root Directory** to `frontend`.
4. Configure Build Settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variables:
   - `VITE_API_BASE_URL`: `https://your-backend-api.onrender.com` (URL of your deployed backend)
6. Click **Deploy**. Vercel will automatically build and publish your web app.

---

## Option 2: Deploy Frontend to Netlify

1. Log in to [Netlify](https://www.netlify.com/) and click **Add new site -> Import from Git**.
2. Select your GitHub repository (`ProjectSystem`).
3. Netlify will automatically detect `netlify.toml` from your project root:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
4. Add Environment Variable under Site Settings -> Environment variables:
   - `VITE_API_BASE_URL`: `https://your-backend-api.onrender.com`
5. Click **Deploy Site**.

---

## Option 3: Deploy Backend Node.js Server (Render / Railway)

### Deploying to Render:
1. Log in to [Render](https://render.com/) and click **New -> Web Service**.
2. Connect your GitHub repository (`ProjectSystem`).
3. Configure Service:
   - **Root Directory**: `backend-node`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add Environment Variables:
   - `PORT`: `8080`
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `your-random-secret-key`
   - `FIREBASE_PROJECT_ID`: `project-m-s-6db6b`
   - `FIREBASE_CLIENT_EMAIL`: `firebase-adminsdk-fbsvc@project-m-s-6db6b.iam.gserviceaccount.com`
   - `FIREBASE_PRIVATE_KEY`: `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` (Paste contents from `serviceAccountKey.json`)
5. Click **Create Web Service**. Render will deploy your Node.js API server and give you an HTTPS backend URL (e.g., `https://project-backend.onrender.com`).

---

## Local Development Quickstart

To run the application locally:

### 1. Start Node.js Express Backend
```bash
cd backend-node
npm install
npm run dev
```
Backend runs on: `http://localhost:8080`

### 2. Start React Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on: `http://localhost:5173`
