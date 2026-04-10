# AI Interview Platform (AI Tutor Screener)

A robust, full-stack AI-driven interview platform designed to facilitate automated candidate screening and interactive voice-based technical interviews. It evaluates candidates dynamically and provides deep analytics for administrators.

---

## 🏗️ Architecture & Project Structure

This project is separated into a **Frontend** (Next.js) and a **Backend** (Node.js & Express). Let's dive deep into the specific structure of both codebases to understand how the platform works.

### 🌐 Frontend Structure (`/frontend`)

The frontend is built with **Next.js 16+ (App Router)**, **React 19**, **Tailwind CSS v4**, **Framer Motion**, **Zustand** for state management, and **Clerk** for robust authentication.

```text
frontend/
├── src/
│   ├── app/                 # Next.js App Router Pages
│   │   ├── admin/           # Secured Admin Analytics Dashboard
│   │   ├── dashboard/       # Post-login user portal (choose Interview/Admin)
│   │   ├── evaluation/      # Post-interview evaluation and results screen
│   │   ├── interview/       # Active interview arena (WebRTC / WebSockets)
│   │   ├── layout.tsx       # Root layout wrapper (Clerk Provider, Theme)
│   │   └── page.tsx         # Landing page
│   ├── components/          # Reusable UI components (Shadcn/Radix-UI, Forms)
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions and shared instances
│   └── services/            # API integration & abstractions (Axios)
├── public/                  # Static assets (images, icons)
├── .env                     # Local Environment variables
├── next.config.ts           # Next.js specific build configurations
├── package.json             # Dependencies and scripts
└── tailwind.config.ts / postcss # Tailwind UI styling configuration
```

#### Code Flow (Frontend):
1. **Authentication:** Users land on the main page and authenticate using Clerk via `<SignIn />` flows.
2. **Dashboard:** Once authenticated, users access the `/dashboard` page where they enter details like `candidateName` and can select whether to start the interview process or access the Admin portal.
3. **The Interview Arena Context:** At `/interview`, the app hooks into WebSocket events to communicate actively with the backend for live audio data handling and questions synchronization. 
4. **State Management:** **Zustand** manages global application states like the current interview context or user configurations securely without heavy re-renders.

---

### ⚙️ Backend Structure (`/backend`)

The core backend infrastructure runs on **Node.js, Express.js**, and **TypeScript**, acting as an API server and WebSocket provider via **Socket.io**. Database interactions are managed securely using **Prisma ORM** mapping onto **PostgreSQL**, with **OpenAI** integrations for AI intelligence.

```text
backend/
├── src/
│   ├── config/              # Server config files & environment mapping
│   ├── controllers/         # Core business logic (Rest API handling)
│   │   ├── interviewController.ts # Logic for creating/tracking interviews
│   │   └── voiceController.ts     # Audio ingestion and OpenAI conversational logic
│   ├── middlewares/         # Express middlewares (Auth, rate limiters, err handlers)
│   ├── routes/              # Express API Route definitions
│   ├── services/            # Service layer (OpenAI integration, DB calls)
│   ├── sockets/             # Socket.IO event handlers for live interviewing
│   ├── utils/               # Helper utilities (logging via Winston, responses)
│   ├── validations/         # Zod schemas for input data validation
│   ├── app.ts               # Express configuration, Router mounting
│   └── server.ts            # Entrypoint, WebServer and Socket instantiation
├── prisma/                  # Prisma ORM Configurations
│   └── schema.prisma        # Database schema definitions for Candidates, Sessions
├── temp_audio/              # Temporary file path mapped for Multer audio ingest
├── .env                     # Access keys, DB connection strings
├── Dockerfile & compose     # Containerization configs
└── package.json             # Dependencies and scripts
```

#### Code Flow (Backend):
1. **Initialization:** Starting `server.ts` prepares both `app.ts` (the Express app with `/api/v1` routes) and the `socket.io` instance attached to the single thread.
2. **Interviews Initialization API:** Routes map to `interviewController`, which saves new candidates into the database using Prisma and sets up a session framework.
3. **Real-time AI Chat & Socket.io:** The `sockets` system receives bidirectional event streams from the frontend, handing raw voice notes into `voiceController.ts` which uses `services` pointing to OpenAI's completion/voice endpoints. 
4. **Data Persistence:** Responses and AI scoring metrics are committed to PostgreSQL, ready to be requested by the frontend when an admin accesses the Analytics Dashboard.

---

## 🚀 Getting Started (Run Locally)

The application depends on both frontend and backend instances communicating concurrently. Make sure you have **Node.js v20+** and a running **PostgreSQL** instance.

### Step 1: Setup the Backend
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Prepare Environment Variables. Create `.env` inside `/backend` (referencing standard credentials required across config):
   ```env
   DATABASE_URL="postgresql://user:pass@your_db_host:5432/ai_interview"
   OPENAI_API_KEY="sk-your-openai-api-key"
   PORT=8000
   ```
4. Setup Database & Prisma (run this to configure DB schema):
   ```bash
   npx prisma generate
   npx prisma db push
   ```
5. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The backend will boot up alongside the WebSocket server on your configured port.*

### Step 2: Setup the Frontend
1. Open up a second terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Provide Environment Variables. Add `.env` or `.env.local` to `/frontend` root:
   ```env
   # Clerk Auth Keys
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...

   # Specify Backend Local Endpoint
   NEXT_PUBLIC_BACKEND_URL=https://your-production-backend-url.com
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *The Next.js App Router will be built and started continuously.*

---

## 🛠 Tech Stack Details

**Frontend Architecture:** Next.js 16 (App Router), React 19, TailwindCSS v4, Zustand, Framer Motion, Axios for fetching data, ShadcnUI / Radix primitives.

**Backend Engineering:** Express.js, TypeScript, OpenAI API, Prisma ORM, PostgreSQL, Socket.io (real-time Audio/RTC sync), Zod schemas, Winston logger, Express Rate Limit, Multer (file processing).

---

## 🤝 Conclusion

This full-stack environment has robust boundaries between the heavily interactive WebRTC/voice-focused dashboard UI (Next.js) and a strictly typed, Socket.io integrated API layer (Node/Express/Prisma) handling session retention and AI communications safely away from the client browser.

---

> **Note:** The Admin Access passkey for the analytics dashboard is simply the company's name.
