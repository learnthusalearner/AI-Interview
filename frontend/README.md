# Lumina AI - The Frontend Experience 🎨

This directory houses the breathtaking visual layer of the **Lumina AI Platform**. Built with uncompromising attention to detail, this Next.js application captures the aesthetic of a premium, million-dollar SaaS product. 

What makes it unique is the complete departure from flat, lifeless enterprise design—instead, we use heavy glassmorphism, dynamic Aurora gradients, and fluid `framer-motion` physics to make every click feel expensive.

## 🏗️ Technical Structure

- **Next.js (App Router)**: Lightning-fast, server-rendered React framework handling our routing and layout.
- **Micro-Interactions (`framer-motion`)**: Elements never just appear; they float, they spring, and they glow dynamically based on user context.
- **Zustand State**: Forget heavy Redux stores; we use hyper-optimized Zustand so that components only render precisely when they get new AI context.
- **Shadcn UI & Tailwind v4**: A headless foundation mapped strictly to our bespoke `Outfit` font and deep-space color palette (Obsidian, Neon Cyan, and Violet).

## 🗂️ Map of the Domain

```text
src/
 ├── app/                 # The physical screens
 │   ├── admin/           # Lumina Command Center (3D Analytics)
 │   ├── dashboard/       # Applicant applicant tracking portal
 │   ├── interview/       # The WebRTC live chat arena
 │   └── page.tsx         # The cinematic landing screen
 ├── components/ui/       # Extracted, highly customized Shadcn blocks
 ├── hooks/               # Custom system abstractions (e.g., useAudioRecorder)
 ├── lib/store.ts         # Global Zustand state bridging the gaps
 └── services/api.ts      # Axios abstractions connecting to our Node API
```

## 🚀 Booting the Visuals

1. Ensure your `.env` contains:
   ```env
   NEXT_PUBLIC_API_URL=https://your-production-backend-url.com
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```
2. Install dependencies: `npm install`
3. Ignite the engine: `npm run dev`

Your platform will launch securely to your configured domain. Be ready with microphone access so the Lumina Core can properly synchronize during testing!
