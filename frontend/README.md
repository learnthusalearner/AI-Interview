# AI Tutor Screener - Frontend UI

A highly polished, ultra-modern Next.js frontend capturing the aesthetic and usability of a premium 20+ year-designed SaaS application. Features extensive frame-motion wrappers, UIverse-inspired audio visualization, and flawless responsiveness.

## Tech Stack
- Next.js (App Router)
- React 18+ & TypeScript
- Tailwind CSS v4 
- `shadcn/ui` components
- `framer-motion` for micro-interactions
- `zustand` for high-performance frontend state
- Web Speech / MediaRecorder APIs for Mic Access

## 🚀 Quick Start
Make sure your backend is already deployed and running.

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Run the Development Server**
   ```bash
   npm run dev
   ```
   *Your app will automatically launch on your deployed domain.*

## Core Screens
1. **Landing Page (`/`)**: A beautiful, glowing onboarding screen collecting candidate information to bridge the initial session securely.
2. **Interview Board (`/interview`)**: The live testing ground. Includes a visually distinguished chat log with pulsing UI elements and an animated Web Speech recording mechanism reminiscent of premium AIs (like the ChatGPT Voice mode).
3. **Evaluation Dashboard (`/evaluation`)**: A dashboard reading the raw AI JSON grading rubric and plotting it perfectly alongside ShadCN Progress bars, showcasing Clarity, Warmth, Patience, and Key Quotes.

## Note on MediaRecorder
The app inherently needs Microphone access. Ensure your browser grants permission when hitting "Start Interview".
