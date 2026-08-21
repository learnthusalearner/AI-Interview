# AI Interviewer Frontend

## Overview
The frontend for the **AI Interview Platform** provides a dynamic, responsive, and secure interface for candidates to undergo automated evaluations, and for administrators to review their performance.

## Architecture
Built heavily on modern React paradigms, the frontend utilizes **Next.js 16 (App Router)**.
- **UI & Styling**: Crafted with **TailwindCSS v4**, **Shadcn UI**, and **@base-ui/react** to ensure a high-quality, accessible, and polished user experience. **Framer Motion** drives the micro-interactions and smooth page transitions.
- **State Management**: Managed globally via **Zustand**, orchestrating interview states, proctoring flags, and chat history without prop-drilling.
- **Authentication**: Secured by **Clerk (@clerk/nextjs)** for rapid and secure user management, differentiating between Candidates and Admins seamlessly.
- **Real-time Proctoring**: Sends webcam frames to the backend via **Socket.IO** at 10 FPS for server-side ML inference (BlazeFace + COCO-SSD), keeping the client lightweight and tamper-resistant.

## Project Structure
```text
frontend/
├── src/
│   ├── app/              # Next.js App Router pages and layouts
│   │   ├── interview/    # Candidate interview platform
│   │   ├── dashboard/    # Candidate result dashboard
│   │   ├── evaluation/   # Detailed evaluation results
│   │   └── admin/        # Admin dashboard for reviewing metrics
│   ├── components/       # Reusable UI components (Shadcn UI)
│   ├── hooks/            # Custom React hooks (useAudioRecorder, etc.)
│   ├── lib/              # Zustand store, utilities, face detector
│   └── services/         # Backend API client (axios)
├── public/               # Static assets
├── middleware.ts          # Clerk Auth middleware
├── .env.example           # Reference env file — copy to .env.local
└── package.json
```

## Setup & Running Locally

### 1. Prerequisites
- **Node.js** v18+
- The **backend** server running at `http://localhost:3000`

### 2. Environment Variables
Copy the example file and fill in your values:
```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend REST API base URL (e.g. `http://localhost:3000/api/v1`) |
| `NEXT_PUBLIC_SOCKET_URL` | ✅ | Backend Socket.IO root URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk publishable key (starts with `pk_`) |
| `CLERK_SECRET_KEY` | ✅ | Clerk secret key (starts with `sk_`) |

> **Clerk keys** → Create a free app at [clerk.com](https://clerk.com) → Dashboard → API Keys

### 3. Installation
```bash
cd frontend
npm install
```

### 4. Running the Application
Start the development server:
```bash
npm run dev
```
The frontend will be accessible at `http://localhost:3001`.

### 5. Production Build
```bash
npm run build
npm start
```
