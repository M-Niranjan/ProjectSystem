# Project Management System Hub

A full-stack enterprise **Project Management System** built with **React 19 + TypeScript + Vite** on the frontend, **Node.js + Express** on the backend, and **Firebase Authentication + Cloud Firestore** for persistent identity, role authorization, and data storage.

---

## Clean Project Structure

```
c:\PM\
├── frontend/                 # React 19 + TypeScript + Vite Single-Page Web Application
│   ├── src/                  # Components, Pages, Firebase Services, Zustand Stores
│   ├── public/               # Static assets & icons
│   ├── dist/                 # Web build output directory
│   ├── package.json          # Frontend dependencies & build scripts
│   ├── vite.config.ts        # Vite dev server & proxy settings
│   └── .env                  # Frontend environment variables
│
├── backend-node/             # Node.js + Express + Firebase Admin REST API
│   ├── src/                  # Controllers, Routes, Middleware, & Firebase Admin Config
│   ├── serviceAccountKey.json # Firebase Admin SDK Service Account Key
│   ├── database.sqlite       # Local SQLite Database
│   ├── package.json          # Backend dependencies & scripts
│   └── .env                  # Backend environment variables
│
├── firestore.rules           # Cloud Firestore Security Rules
├── netlify.toml              # Netlify Deployment configuration
├── vercel.json               # Vercel Deployment configuration
├── DEPLOYMENT.md             # Complete Vercel & Netlify Deployment Guide
└── README.md                 # Project documentation
```

---

## Features & Modules

- **Authentication & Authorization**: Firebase Auth + Cloud Firestore `users/{UID}` role resolution (`admin`, `teamLeader`, `employee`).
- **User Directory**: Admin & Team Leader user provisioning with immediate Firestore persistence.
- **Task & Project Pipeline**: Task steps, verification workflows, calendar, interactive kanban boards.
- **Team Work Tracking**: Employee capacity hours, workload allocation %, and performance metrics.
- **Real-Time Communication**: In-app channels, messaging, and notification alerts.

---

## Deployment & Documentation

For step-by-step instructions on deploying the frontend to **Vercel** or **Netlify**, and the backend to **Render** or **Railway**, see [DEPLOYMENT.md](file:///c:/PM/DEPLOYMENT.md).
