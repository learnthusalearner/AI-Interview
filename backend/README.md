# AI Interviewer Backend

## Overview
The backend for the **AI Interview Platform** powers the core logic of the application. It manages everything from candidate sessions and AI-driven conversational evaluations (via OpenAI) to real-time proctoring (using TensorFlow.js) and email notifications.

## Architecture
The backend is built with a robust, scalable architecture using **Node.js, Express, and TypeScript**.
- **Database Layer**: Uses **PostgreSQL** paired with **Prisma ORM** for type-safe database access and schema migrations. The database tracks `InterviewSession` and `Message` entities, complete with granular scoring metrics (clarity, warmth, etc.).
- **Proctoring Engine**: Runs **TensorFlow.js** (`@tensorflow-models/blazeface` and `coco-ssd`) directly on the Node server. This processes Base64-encoded webcam frames sent from the frontend to detect misconduct (multiple faces, missing faces, or cell phones), improving security over client-side validation.
- **AI Integration**: Connects with **OpenAI API** to drive the conversational flow, evaluate responses, and determine when to proceed or early-terminate an interview.
- **Notification System**: Utilizes **Nodemailer** to automatically dispatch tailored acceptance/rejection emails to candidates based on admin decisions.

## Project Structure
```text
backend/
├── prisma/               # Database schema and migrations
│   └── schema.prisma
├── src/
│   ├── config/           # Environment variables and API configurations
│   ├── controllers/      # Route handlers implementing business logic
│   ├── middlewares/      # Security, validation, and error middlewares
│   ├── ml/               # TensorFlow inference service & ML routes
│   ├── routes/           # Express API route definitions
│   ├── services/         # Core business logic (AI, Proctoring, Email)
│   ├── sockets/          # Socket.IO real-time proctoring handlers
│   ├── utils/            # Helper functions and constants
│   ├── validations/      # Zod validation schemas for requests
│   ├── app.ts            # Express application setup
│   └── server.ts         # Server entry point
├── .env.example          # Reference env file — copy to .env
├── package.json
└── tsconfig.json
```

## Setup & Running Locally

### 1. Prerequisites
- **Node.js** v18+
- **PostgreSQL** database — [Neon](https://neon.tech) (free cloud) or local

### 2. Environment Variables
Copy the example file and fill in your values:
```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `OPENAI_API_KEY` | ✅ | Used for Whisper STT (`whisper-1`) and chat/eval (`gpt-4o-mini`) |
| `GEMINI_API_KEY` | ⬜ | When set, Gemini is the primary LLM; OpenAI becomes fallback |
| `PORT` | ⬜ | Server port (default: `3000`) |
| `NODE_ENV` | ⬜ | `development` / `production` / `test` |
| `CORS_ORIGIN` | ⬜ | Allowed CORS origin (default: `*`) |
| `SMTP_HOST` | ⬜ | SMTP host for email notifications |
| `SMTP_PORT` | ⬜ | SMTP port (default: `587`) |
| `SMTP_USER` | ⬜ | SMTP username |
| `SMTP_PASS` | ⬜ | SMTP password |
| `SMTP_FROM` | ⬜ | Sender name and email address |

> **Get your keys:**
> - **PostgreSQL** → [neon.tech](https://neon.tech)
> - **OpenAI** → [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
> - **Gemini** → [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 3. Installation
```bash
cd backend
npm install
```

### 4. Database Initialization
Generate the Prisma client and push the schema to your database:
```bash
npx prisma generate
npx prisma db push
```

### 5. Running the Application
Start the development server using `ts-node-dev`:
```bash
npm run dev
```
The server will be running on `http://localhost:3000` (or the `PORT` you specified).

### 6. Production Build
```bash
npm run build
npm start
```
*Note: `npm start` automatically runs `npx prisma db push` before executing the build, making it suitable for unified deployment environments like Render.*
