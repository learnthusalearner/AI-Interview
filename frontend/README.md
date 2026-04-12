# AI Interviewer Frontend

## Overview
The frontend for the **AI Interview Platform** provides a dynamic, responsive, and secure interface for candidates to undergo automated evaluations, and for administrators to review their performance. 

## Architecture
Built heavily on modern React paradigms, the frontend utilizes **Next.js 16 (App Router)**.
- **UI & Styling**: Crafted with **TailwindCSS v4**, **Shadcn UI**, and **@base-ui/react** to ensure a high-quality, accessible, and polished user experience. **Framer Motion** drives the micro-interactions and smooth page transitions.
- **State Management**: managed globally via **Zustand** orchestrating interview states, proctoring flags, and chat history optimally without prop-drilling.
- **Authentication**: Secured by **Clerk (@clerk/nextjs)** for rapid and secure user management, differentiating between Candidates and Admins seamlessly.
- **Camera integration**: Interacts deeply with browser media APIs to capture candidate feeds locally. Crucially, proctoring frame snapshots are securely transmitted to the backend for ML evaluation, keeping the client lightweight and tamper-resistant.

## Project Structure
```text
frontend/
├── src/
│   ├── app/              # Next.js App Router pages and layouts
│   │   ├── interview/    # Candidate interview platform
│   │   └── admin/        # Admin dashboard for reviewing metrics
│   ├── components/       # Reusable UI components (buttons, camera interface, chat)
│   ├── hooks/            # Custom React hooks (e.g., useCamera, useInterview)
│   ├── lib/              # Utility functions, API clients mapping
│   └── services/         # Interfaces for calling backend APIs
├── public/               # Static assets
├── middleware.ts         # Clerk Auth middleware
├── tailwind.config.js
└── package.json
```

## Setup & Running Locally

### 1. Prerequisites
- **Node.js** (v18+ recommended)

### 2. Environment Variables
Create a `.env.local` file in the `frontend/` directory. Required variables typically include:
```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_API_URL="http://localhost:3000/v1"
```

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
The frontend will be accessible at `http://localhost:3001` (specifically port `3001` as configured in package.json).

### 5. Production Build
```bash
npm run build
npm start
```
