# AI Tutor Screener Backend

A production-ready ("enterprise-grid"), robust Node.js backend using Express, TypeScript, Mongoose/Prisma + PostgreSQL, OpenAI Whisper, GPT-4, and WebSocket to conduct fully-dynamic AI screener interviews.

## Features Included 🌟
- **Voice Pipeline**: Converts m4a/mp3 speech to text using OpenAI Whisper API. Temporary file handling via `multer`.
- **Intelligent AI Interview Engine**: Stateful dialogue. Handles silence/short answers securely with the AI naturally prompting.
- **Evaluation Engine**: GPT-4 driven strict JSON evaluators for scoring on clarity, warmth, patience.
- **Enterprise Best Practices**:
  - `winston` structured logging
  - `zod` for 100% startup validation and Route strict payload validation.
  - Custom `AppError` and global error handling logic.
  - Rate-limiting, CORS, Helmet integrations.
  - Clean separation of Services, Controllers, and Routers.
- **Real-Time Engine**: WebSocket via `Socket.IO` ready for streaming clients.
- **Docker Compose**: Pre-packaged containerization logic for PostgreSQL and Node App.

## Pre-requisites
- [Node.js v20+](https://nodejs.org/en)
- [Docker & Docker Compose](https://www.docker.com/) 
- A valid **OpenAI API Key**.

## Quick Start (Local Setup)

1. **Clone & Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Variables:**
   Copy `.env.example` to `.env` and fill out your `OPENAI_API_KEY`.
   ```bash
   cp .env.example .env
   ```

3. **Database Setup (Docker required):**
   Use Docker compose to spin up the local Postgres Database:
   ```bash
   docker-compose up -d db
   ```

4. **Initialize DB Schema (Prisma):**
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Start Dev Server:**
   ```bash
   npm run dev
   ```

## API Documentation 

### 1. `POST /api/v1/voice/input`
- **Request Type**: `multipart/form-data`
- **Payload**: `audio` (File)
- **Response**: `{ success: true, data: { transcript: string } }`

### 2. `POST /api/v1/interview/start`
- **Request Body**: `{ "candidateName": "John" }`
- **Response**: Starts session and returns initial question + sessionId.

### 3. `POST /api/v1/interview/respond`
- **Request Body**: `{ "sessionId": "UUID...", "text": "candidate reply..." }`
- **Response**: Sends the AI response based on the conversation context.

### 4. `POST /api/v1/interview/evaluate`
- **Request Body**: `{ "sessionId": "UUID..." }`
- **Response**: JSON Evaluation results (scores & recommendation).

### 5. WebSocket Connection (`ws://localhost:3000`)
Clients can connect to socket via `socket.io-client` with events:
- `emit('start_interview', { candidateName: 'x' })`
- `emit('respond', { sessionId: 'xyz', text: 'response' })` 

## Production Build & Deploy
Everything can be launched cleanly via docker-compose:
```bash
docker-compose up --build -d
```
