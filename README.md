# Lumina AI Platform ✨

Welcome to **Lumina AI**, an ultra-premium, full-stack AI interviewing platform. This project elevates automated candidate screening by offering a conversational, voice-driven AI that interacts seamlessly with candidates, followed by deep, multifaceted analytics for administrators. 

What makes Lumina AI unique is its hyper-modern aesthetic—trading standard flat forms for **cinematic dark modes, glassmorphism, and neon aurora gradients**, paired with a backend built to handle **real-time AI stream processing**.

---

## 🏗️ The Lumina Engine: Architecture & Project Structure

Lumina AI firmly separates the client visual engine from the intense processing API. 

### 1. `frontend/` (The Visual Engine)
Built with **Next.js 16+ (App Router)** and **React 19**, the frontend is entirely focused on delivering a million-dollar UI experience. 
- **Tech Highlights**: Tailwind CSS v4, Framer Motion for spring-physics interactions, Zustand for high-speed state, and Clerk for impenetrable Auth.
- **Unique UI Features**: Aurora meshes, glowing floating action buttons, and a flawless 3D Isometric Chart for admin analytics.
- **Structure**: 
  - `src/app/` - The core routers (`/interview` for the live WebRTC socket room, `/admin` for the Command Center).
  - `src/components/` - Shadcn UI wrappers combined with custom Lucide-react iconography.
  - `src/services/` - Strictly typed Axios API layers communicating to the backend.

### 2. `backend/` (The Logic Core)
Built on **Node.js, Express, and TypeScript**, the backend orchestrates data storage and interfaces with the LLMs.
- **Tech Highlights**: Prisma ORM over PostgreSQL, Socket.io for live bidirectional audio chunks, Zod for flawless runtime validation.
- **Unique Processing**: Audio ingestion flows through `multer` to OpenAI's Whisper API, processes dialogue state via GPT-4, and streams back real-time context.
- **Structure**:
  - `src/controllers/` - Handles REST endpoints and triggers background evaluations.
  - `src/sockets/` - Dedicated event hooks for the live interviewing arena.
  - `src/services/` - Abstracted OpenAI logic and DB transactions.

---

## 🚀 Quick Setup & Deployment

Lumina AI relies on parallel execution of both environments. Ensure you have **Node.js v20+** and a running **PostgreSQL** instance.

### Phase 1: Backend API Boot
1. Open terminal -> `cd backend`.
2. `npm install`.
3. Configure your `.env` (requires `DATABASE_URL` and `OPENAI_API_KEY`).
4. Apply the database schema: `npx prisma db push`.
5. Run the server: `npm run dev` (Connects to port 5000/8000 depending on config).

### Phase 2: Frontend Command Center Boot
1. Open a new terminal -> `cd frontend`.
2. `npm install`.
3. Configure `.env` (requires `NEXT_PUBLIC_API_URL` pointing to the backend, and Clerk keys).
4. Run the UI: `npm run dev`.
5. Your browser will launch the ultra-premium landing page on `localhost:3000`.

---

## 🤝 Philosophy
Lumina AI isn't just an app; it's a statement on how enterprise tools should feel. We believe that tools for human resources should embody high design constraints and feel like magic to interact with.
