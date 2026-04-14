# 암기준섹 (Vocabulary Study App)

A Korean vocabulary learning app built with React, Vite, TypeScript, and Supabase. Supports vocabulary management, quiz modes, group study, and AI-powered features.

## Architecture

This app has two processes that run together:

1. **Express API server** (`server/index.ts`) on port 3001 — handles all AI-related API calls with server-side secret keys
2. **Vite frontend** (`src/`) on port 5000 — React app, proxies `/api/*` requests to the backend server

### Stack
- **Frontend**: React 18, Vite 5, TypeScript
- **UI**: Tailwind CSS, shadcn/ui (Radix UI primitives), Framer Motion
- **Routing**: React Router v6
- **State**: TanStack React Query
- **Auth & Database**: Supabase (PostgreSQL + Auth + Storage)
- **Backend API**: Express.js (Node.js) server in `server/index.ts`
- **AI Features**: Cerebras (quiz generation, word meanings, validation), Gemini (vocabulary extraction), PDF.co (PDF text extraction)

### API Routes (server/index.ts)
All AI-related logic runs server-side as Express routes:
- `POST /api/get-word-meaning` — Get Korean meaning of English words via Cerebras
- `POST /api/generate-ai-quiz` — Generate quiz questions via Cerebras
- `POST /api/validate-meaning` — Validate user answers via Cerebras
- `POST /api/extract-vocabulary` — Extract vocabulary from uploaded PDFs via PDF.co + Gemini
- `POST /api/generate-vocabularies` — Bulk generate vocabulary lists via Cerebras (admin only)
- `POST /api/delete-user` — Admin: delete a user account (requires auth token)
- `GET /api/health` — Health check

### Frontend API calls (src/services/api.ts)
Frontend calls its own `/api` endpoints (proxied to port 3001 by Vite) instead of Supabase Edge Functions.

### Key Source Directories
- `src/pages/` — All route pages
- `src/components/` — Reusable components
- `src/hooks/` — Custom React hooks (auth, toast, mobile, tutorial, quiz sound)
- `src/integrations/supabase/` — Supabase client + auto-generated database types
- `src/services/` — API client (`api.ts`) + local storage service
- `src/utils/` — Utility helpers (sync, image upload, local vocab)
- `server/` — Express.js backend API server
- `supabase/migrations/` — All Supabase database migrations (for reference)
- `supabase/functions/` — Legacy Supabase Edge Functions (no longer used)

## Environment Variables (Replit Secrets)
- `VITE_SUPABASE_URL` — Supabase project URL (public)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/public key (public)
- `CEREBRAS_API_KEY` — Cerebras AI API key (secret)
- `GEMINI_API_KEY` — Google Gemini API key (secret)
- `PDF_CO_API_KEY` — PDF.co API key (secret)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (secret, server-side only)

## Running the App
Two workflows run in parallel:
- **Start application**: `npm run dev` — starts Vite on port 5000
- **Backend API**: `npx tsx server/index.ts` — starts Express API on port 3001

```bash
npm run dev      # Runs both server + frontend concurrently (via concurrently)
npm run server   # Backend API server only
npm run build    # Production build to dist/
```

## Features
- Vocabulary creation (manual, Excel upload, PDF/image upload, word list, AI-generated)
- Multiple study modes: Flashcard, Multiple choice, Writing, Matching, Random
- AI quiz generation with difficulty levels
- Group study with real-time chat, polls, shared vocabularies
- Public vocabulary marketplace
- Admin panel for user/content management
- Guest mode with localStorage fallback + cloud sync on login
- Tutorial system for new users
