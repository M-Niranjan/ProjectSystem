# Project Management System Hub

A full-stack enterprise **Project Management System** built with **React 19 + TypeScript + Vite** on the frontend, **Node.js + Express** and **Spring Boot** on the backend, **Android (Capacitor)** for mobile, and **Firebase Authentication + Cloud Firestore** for persistent identity, role authorization, and data storage.

---

## Clean Project Structure

```
n:\PMS\
├── frontend/                 # React 19 + TypeScript + Vite Single-Page Web Application
│   ├── src/                  # Components, Pages, Firebase Services, Zustand Stores
│   ├── android/              # Native Android project with Capacitor
│   ├── public/               # Static assets & icons
│   ├── package.json          # Frontend dependencies & build scripts
│   ├── vite.config.ts        # Vite dev server & proxy settings
│   └── .env                  # Frontend environment variables
│
├── backend-node/             # Node.js + Express + Firebase Admin REST API
│   ├── src/                  # Controllers, Routes, Middleware, & Firebase Admin Config
│   ├── package.json          # Backend dependencies & scripts
│   └── .env                  # Backend environment variables
│
├── backend/                  # Java Spring Boot backend application
│   ├── src/                  # Controllers, Models, Repositories, Security & Services
│   └── build.gradle          # Gradle build file
│
├── apk/                      # Android debug & release APK packages
├── firestore.rules           # Cloud Firestore Security Rules
└── README.md                 # Project documentation
```

---

## Features & Modules

- **Authentication & Authorization**: Firebase Auth + Cloud Firestore `users/{UID}` role resolution (`admin`, `teamLeader`, `employee`).
- **User Directory**: Admin & Team Leader user provisioning with immediate Firestore persistence.
- **Task & Project Pipeline**: Task steps, verification workflows, calendar, interactive kanban boards.
- **Team Work Tracking**: Employee capacity hours, workload allocation %, and performance metrics.
- **Real-Time Communication**: In-app channels, messaging, and notification alerts.
- **Mobile Android Application**: Built with Capacitor and Android SDK.
