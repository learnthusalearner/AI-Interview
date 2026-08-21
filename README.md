# The AI Tutor Screener

> 🔐 **ADMIN PASSWORD: `Admin123`**

---

## 🚀 Full-Stack Setup Guide

This project is a monorepo with two workspaces:

```
AI-Interview/
├── backend/    # Node.js + Express + Prisma API
└── frontend/   # Next.js 16 App Router
```

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | v18+ | [Download](https://nodejs.org) |
| npm | v9+ | Bundled with Node.js |
| PostgreSQL | any | [Neon (free cloud)](https://neon.tech) · [Supabase](https://supabase.com) · local |

---

### Step 1 — Clone the repository

```bash
git clone <your-repo-url>
cd AI-Interview
```

---

### Step 2 — Configure the Backend

```bash
cd backend

# 1. Copy the example env file and fill in your values
cp .env.example .env
```

Open `backend/.env` and set **at minimum** these two variables:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
OPENAI_API_KEY="sk-proj-..."
```

> **Get your keys:**
> - **PostgreSQL** → [neon.tech](https://neon.tech) (free, no credit card)
> - **OpenAI** → [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
> - **Gemini (optional)** → [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

```bash
# 2. Install dependencies
npm install

# 3. Generate Prisma client and push schema to DB
npx prisma generate
npx prisma db push

# 4. Start the dev server  →  http://localhost:3000
npm run dev
```

---

### Step 3 — Configure the Frontend

Open a **new terminal**, then:

```bash
cd frontend

# 1. Copy the example env file and fill in your values
cp .env.example .env.local
```

Open `frontend/.env.local` and set these variables:

```dotenv
NEXT_PUBLIC_API_URL="http://localhost:3000/api/v1"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
```

> **Clerk keys** → Create a free app at [clerk.com](https://clerk.com) → Dashboard → API Keys

```bash
# 2. Install dependencies
npm install

# 3. Start the dev server  →  http://localhost:3001
npm run dev
```

---

### Step 4 — Open the App

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:3000/api/v1 |
| Health check | http://localhost:3000/health |

> **Admin panel** → Sign in and navigate to `/admin` · Password: `Admin123`

---

### Production Build

**Backend:**
```bash
cd backend
npm run build   # runs prisma generate + tsc
npm start       # runs prisma db push + node dist/server.js
```

**Frontend:**
```bash
cd frontend
npm run build
npm start
```

---

## Application Features

### 📧 SMTP — Automated Email Notifications
Once a candidate completes their interview and a decision is made, the system automatically triggers an SMTP-based email to their registered address notifying them of the outcome. If selected, they receive a congratulatory email with next steps; if rejected, they receive a polite declination. This is handled server-side using a transactional mail service, ensuring candidates are never left waiting and the communication pipeline requires zero manual recruiter effort.

### 🔁 Cold Start Prevention — Keep-Alive Polling
The backend is hosted on Render's free tier, which spins down inactive servers after a period of inactivity. To prevent this, a background polling mechanism pings the server at regular intervals, keeping it perpetually warm. This ensures candidates never experience a slow cold-start delay when beginning their interview session.

### 🤖 ML Face Detection — Anti-Cheating System
An ML-based face detection model (powered by TensorFlow.js BlazeFace + COCO-SSD) runs on the **server** during the interview. It continuously monitors the video feed sent via WebSocket to detect whether the candidate's face is present and centred in the frame. If the candidate looks away, leaves the frame, a second face is detected, or an unauthorized device (phone, laptop) appears, the system flags it as a potential cheating event in real time and logs it to the assessment report.

### 🔐 OAuth Authentication via Clerk
Candidate and recruiter authentication is fully managed by Clerk, which provides OAuth-based sign-in flows (Google, GitHub, etc.). Clerk handles session tokens, JWTs, and secure credential management — meaning zero sensitive auth logic lives on the custom backend. This gives users a seamless, passwordless sign-in experience while keeping the platform secure by default.

---

## What I Built and Which Problem I Picked

**The Problem:** The company hires hundreds of tutors every month. To ensure high-quality education, every candidate must be screened for crucial soft skills: communication clarity, patience, warmth, the ability to simplify complex topics, and English fluency. Currently, human interviewers conduct 10-minute calls to assess this. However, human-led screening is expensive, inherently subjective, slow to execute, and highly difficult to scale during hiring surges.

**What I Built:** I built a fully functional, interactive **AI Tutor Screener**. This platform conducts dynamic, browser-based voice conversations with tutor candidates to assess whether they possess the right pedagogical temperament to move to the next round.

This system isn't designed to test deep mathematical theorems; rather, it heavily simulates the messy reality of teaching a child. The AI acts as a curious, sometimes frustrated, or confused 9-year-old student, asking questions like *"Explain fractions to me"* or indicating *"I don't understand."* It listens to the candidate's spoken response, adapts dynamically, and evaluates their soft skills. After the interview, it produces a structured, dimension-by-dimension assessment (clarity, warmth, simplicity, patience, fluency) backed by exact quotes from the candidate to justify its grading.

---

## Key Decisions and Tradeoffs Made

1. **Voice Interaction Over Text Chat**
   - *Decision:* Real tutoring happens via voice, not keyboard. I prioritized building a browser-based speech interaction (utilizing Web Speech APIs / Whisper for transcription) so the candidate speaks naturally.
   - *Tradeoff:* Voice introduces "messy reality": choppy audio, thick accents, and latency. A text-chat would have been 100% accurate and easy to build, but it completely fails to test the core requirement: verbal fluency and vocal warmth. I accepted the technical complexity of speech-to-text to build a tool that actually tests what matters.

2. **Dynamic, Adaptive Conversations vs. Static Questionnaires**
   - *Decision:* A static list of 10 written questions allows candidates to prepare robotic, scripted answers. I designed the AI to be reactive. If a candidate gives a vague answer, the AI follows up: *"But why do we need a common denominator?"*
   - *Tradeoff:* This significantly increases backend complexity and API inference costs, as the AI must maintain conversational context and evaluate responses on the fly. However, it's the only way to accurately measure patience and adaptability.

3. **Granular Rubric vs. Binary Pass/Fail**
   - *Decision:* Recruiters don't just need a "Pass/Fail" flag. They need to know *why*. I architected the backend to output a structured JSON evaluation mapping to five specific dimensions: `clarity`, `warmth`, `simplicity`, `patience`, and `fluency`.
   - *Tradeoff:* Requiring strict structured data from the LLM limits its token generation speed and requires complex prompt engineering/validation (using tools like Zod). The tradeoff favors actionable recruiter data over raw speed.

4. **Focusing on Candidate Experience & Security**
   - *Decision:* This is a candidate's first interaction with the company. The UI is built with Next.js to be clean, welcoming, and professional. From a security standpoint, all LLM processing, evaluation, and data storage happens strictly on the Node.js backend.
   - *Tradeoff:* Moving everything to the backend requires a robust server architecture (Express/Prisma/PostgreSQL) rather than a simple serverless Next.js app, but it ensures absolutely no API keys or sensitive evaluation metrics are exposed to the client.

---

## Any Interesting Challenges I Hit and How I Solved Them

1. **Handling Edge Cases: One-Word Answers and Long Tangents**
   - *Challenge:* Humans are unpredictable. Some candidates give 3-minute rambling answers, while others just say "Yes."
   - *Solution:* I engineered the system prompt with strict pedagogical behavioral guidelines. For short answers, the AI is trained to prompt expansion (*"Can you walk me through that step-by-step?"*). For tangents, I implemented context windows and polite interruptions, training the AI to gently steer the user back: *"That makes sense, but what if I'm still stuck on the first part?"*

2. **The "Latency vs. Natural Flow" Dilemma**
   - *Challenge:* A normal phone call has less than 200ms of latency. STT (Speech-to-text) + LLM inference + TTS (Text-to-speech) can take several seconds, making the conversation feel totally robotic and destroying the candidate's natural rhythm.
   - *Solution:* I optimized the architecture by heavily streamlining the system prompts and preparing the UI to signal "active listening." By providing visual feedback to the candidate that the "Student is thinking...", it bridges the latency gap and keeps the interaction feeling polite and natural rather than broken.

3. **Database Synchronization in Docker**
   - *Challenge:* When deploying the backend in isolated environments, the Prisma ORM frequently crashed the deployment because the database schema was out of sync upon startup.
   - *Solution:* I refactored the deployment runtime commands directly in the `npm start` pipeline to automatically execute `npx prisma db push` before booting the Node server. This ensured the schema was always robustly applied in stateless environments before traffic hit the server.

---

## What I'd Improve or Add with More Time

1. **Audio-Native Emotion Analysis (Prosody)**
   - Currently, the AI evaluates "warmth" and "patience" strictly from the transcribed text (the words the candidate used). With more time, I would integrate native audio models that assess *how* they said it — detecting frustration, sighs, or a cheerful tone directly from the acoustic features.

2. **Interruptibility / Full Duplex Audio via WebSockets**
   - Real children interrupt their teachers. Currently, the architecture operates sequentially (Candidate speaks → AI thinks → AI speaks). I would migrate to a pure WebSocket-based streaming architecture, allowing the candidate to interrupt the AI mid-sentence, truly simulating a hyper-realistic tutoring environment.

3. **Interactive Digital Whiteboard**
   - Math tutoring is highly visual. I would add a synchronized digital canvas on the frontend. The AI "student" could draw a completely incorrect geometry shape, and the candidate would have to explain the mistake both verbally and visually.

4. **Integration with ATS (Applicant Tracking Systems)**
   - Automate the pipeline further by dispatching the rich JSON rubrics and candidate quotes directly into the company's ATS (like Greenhouse or Lever) the second the interview concludes, drastically reducing recruiter administrative overhead.

---

### Navigation
- [Backend Architecture & Setup](./backend/README.md)
- [Frontend Architecture & Setup](./frontend/README.md)