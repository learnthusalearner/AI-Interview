# Lumina AI - The Logic Core 🧠

Welcome to the central nervous system of **Lumina AI**. While the frontend delivers a million-dollar aesthetic, this backend delivers the sheer, uncompromising enterprise power required to run real-time conversational AI without breaking a sweat.

We didn't settle for a basic CRUD app; this backend streams and dictates bidirectional contextual audio through OpenAI, securely manages live Socket connections, and grades interviews intelligently using LLM-driven deterministic JSON.

## 🏗️ Technical Structure

- **Robust Concurrency**: Run on Node.js / Express, we utilize massive asynchronous throughput handling REST endpoints and WebSocket events simultaneously.
- **Audio Ingestion**: Custom integrations using `multer` allow for rapid temporary ingestion of `webm`/`m4a` audio blobs, which are heavily optimized before routing into OpenAI's Whisper systems.
- **Prisma & PostgreSQL**: Flawless, type-safe database schemas map our Candidates and their session states, providing guaranteed runtime confidence.
- **Enterprise Defenses**: Strict `Zod` payload validation checks, Helmet for header security, Winston for structured terminal logging, and CORS locking.

## 🗂️ Map of the Domain

```text
src/
 ├── config/            # Core loaders (Env vars mapped dynamically)
 ├── controllers/       # The command center for routes
 │   ├── interviewController.ts # Orchestrates starting/concluding evaluation
 │   └── voiceController.ts     # The beating heart: handles Whisper transcription
 ├── routes/            # Express endpoint maps
 ├── services/          # Pure logic functions (OpenAI mappings, DB transactions)
 ├── sockets/           # Real-time WebSocket room managers
 ├── utils/             # Standardization tools (Error handlers, Logging configs)
 ├── validations/       # Immutable Zod input schemas
 ├── app.ts             # Express App Configuration
 └── server.ts          # Alpha Thread: Combines HTTP and Socket layers
```

## 🚀 Booting the Core

To run this locally, you must provide your own external logic provider (OpenAI) and data vault (PostgreSQL).

1. Install dependencies:
   ```bash
   npm install
   ```

2. Establish Environment File (`.env`):
   ```env
   DATABASE_URL="postgresql://user:pass@your_db_host:5432/ai_interview"
   OPENAI_API_KEY="sk-your-openai-api-key"
   PORT=5000
   ```

3. Synchronize your Prisma schemas:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. Ignite the engines:
   ```bash
   npm run dev
   ```

The backend boots securely on your provided port. Keep it active to ensure the Frontend can properly establish its vital WebSocket connections.
