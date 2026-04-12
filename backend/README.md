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
│   ├── routes/           # Express API route definitions
│   ├── services/         # Core business logic (AI, Proctoring, Email)
│   ├── utils/            # Helper functions and constants
│   ├── validations/      # Zod validation schemas for requests
│   ├── app.ts            # Express application setup
│   └── server.ts         # Server entry point
├── package.json
└── tsconfig.json
```

## Setup & Running Locally

### 1. Prerequisites
- **Node.js** (v18+ recommended)
- **PostgreSQL** Database

### 2. Environment Variables
Create a `.env` file in the `backend/` directory referencing `.env.example` if available. Required variables typically include:
```dotenv
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/interview_db"
OPENAI_API_KEY="your_openai_api_key_here"
EMAIL_HOST="smtp.example.com"
EMAIL_USER="your_email@example.com"
EMAIL_PASS="your_email_password"
```

### 3. Installation
```bash
cd backend
npm install
```

### 4. Database Initialization
Generate the Prisma client and push the schema to your local database:
```bash
npx prisma generate
npx prisma db push
```

### 5. Running the Application
Start the development server using `ts-node-dev`:
```bash
npm run dev
```
The server will be running on `http://localhost:3000` (or whatever `PORT` you specified).

### 6. Production Build
```bash
npm run build
npm start
```
*Note: `npm start` automatically runs `npx prisma db push` prior to executing the build, making it suitable for unified deployment environments.*
