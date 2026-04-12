# Intelligent AI Interview Platform

## The Problem
Traditional initial screening processes for job applicants are heavily time-consuming for recruiters and often lack deep technical probing until the second/third rounds. Furthermore, asynchronous video platforms do not adapt to candidate responses and suffer from a lack of real-time cheating prevention.

## What Was Built
I built an **Intelligent AI Interview Platform** that autonomously interviews candidates conversationally via text, evaluating them dynamically using an AI. The platform actively adapts question difficulty, scores responses on metrics like *clarity*, *warmth*, and *simplicity*, and aggregates the results into an Admin dashboard. Concurrently, the platform enforces strict proctoring by quietly capturing and analyzing webcam feed snippets in real-time on the server to prevent cheating (identifying multiple people, use of cell phones, or the candidate stepping out of the frame).

## Key Decisions & Trade-offs
1. **Migrating Proctoring ML to Backend**: Initially considered running TensorFlow.js local inference directly in the browser (BlazeFace/COCO-SSD). **Decision**: I migrated this to the Node.js backend to massively improve security, as tech-savvy candidates could spoof or bypass client-side ML logic. **Trade-off**: High HTTP traffic overhead due to streaming Base64 images periodically and significantly higher CPU usage on the server.
2. **PostgreSQL + Prisma**: Instead of opting for NoSQL (MongoDB), I used a strict relational database to map candidate sessions strictly with their subsequent micro-evaluations and message timelines, leveraging strong typed constraints.
3. **Automated Cut-offs**: Implemented early termination mechanisms. If the system detects severe misconduct or repeatedly superficial answers, it immediately ends the session, saving compute costs (OpenAI API limits) and saving reviewers' time.

## Challenges & Solutions
1. **Challenge - Concurrent Camera Bottlenecks**: In the frontend, initializing the webcam feed at the exact moment the Next.js heavy App router initialized the React DOM blocked the main thread severely, causing video freezes or initialization failures.
   **Solution**: We decoupled the camera initialization from the main render cycle via delay routines and robust asynchronous custom hooks, allowing the interview chat component to mount completely before attaching the proctoring stream, providing a smooth user experience.
2. **Challenge - Docker Database Constraints**: Deploying the backend onto Render faced crashing errors because when stateless environments rebuilt, the database ORM was disconnected or out of sync.
   **Solution**: Restructured the runtime sequence directly by merging ORM schema executions (`npx prisma db push`) into the `npm start` script, ensuring synchronization occurs reliably during startup without relying on manual pre-deployment steps.
3. **Challenge - Typescript Arithmetic Conflicts**: Navigating numeric comparisons with dynamic JSON values loaded from our evaluations. Typescript failed to natively understand deeply nested metadata evaluation structures.
   **Solution**: Refined our Interfaces and employed defensive type assertions for aggregated variables (`evalData.average as number`) to reliably protect mathematical integrity during scoring operations.

## What I'd Improve or Add with More Time
- **WebRTC Stream Infrastructure**: Replacing the current standard HTTP Base64 frame polling with a direct WebRTC streaming layer to slash latency, minimize HTTP overhead, and reduce the server's event-loop blocking from Tensorflow.js operations.
- **Background Worker Queue**: Offloading the heavyweight ML Face/Object detection into a dedicated microservice (e.g., Python FastAPI backend with actual GPU inference or a Redis BullMQ worker in TS) to completely unblock the primary Node APIs executing the conversational AI.
- **Expanded ATS Integrations**: Adding APIs to export comprehensive interview PDFs or dispatching structured data into greenhouse/workable instantly after the interview concludes.

---

### Navigation
- [Backend Documentation](./backend/README.md)
- [Frontend Documentation](./frontend/README.md)
