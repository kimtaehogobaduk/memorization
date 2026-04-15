# 암기준섹 - Vocabulary Learning App

A Korean vocabulary learning app built with Lovable. Supports vocabulary management, quiz modes, group study, and AI-powered features.

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

The `npm run dev` command starts both servers concurrently:
- **Express API server** on port 3001
- **Vite dev server** on port 5000

## Environment Variables / Secrets

### Replit Secrets (set in Secrets panel)
- `GEMINI_API_KEY` — Google Gemini API key for vocabulary extraction from files
- `GEMINI_API_KEY_2` — Secondary Gemini key for rotation
- `CEREBRAS_API_KEY` — Cerebras API key for quiz generation, word meanings, and answer validation

### Replit Env Vars (shared environment)
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key
- `VITE_SUPABASE_PROJECT_ID` — Supabase project ID

### Optional (for admin features)
- `SUPABASE_SERVICE_ROLE_KEY` — Required for user deletion and vocabulary generation admin features

## API Routes (Express Server)

| Route | Description |
|-------|-------------|
| `POST /api/extract-vocabulary` | Extract vocabulary from uploaded PDF/image using Gemini AI |
| `POST /api/get-word-meaning` | Get Korean meaning, pronunciation, examples for an English word using Cerebras |
| `POST /api/generate-ai-quiz` | Generate quiz questions for vocabulary words using Cerebras |
| `POST /api/validate-meaning` | Validate user's Korean answer against correct meaning using Cerebras |
| `POST /api/generate-vocabularies` | Admin: bulk generate vocabulary lists using Cerebras |
| `POST /api/delete-user` | Admin: delete a user account via Supabase admin API |

## Key Features
- Vocabulary creation and management with chapters
- AI-powered word meaning lookup (auto-fill)
- File upload (PDF/image) for vocabulary extraction
- Multiple quiz modes (multiple choice, writing, AI-generated, matching)
- Group study features with real-time chat
- Admin panel for user management
- Bookshelf organization for vocabularies
- Study progress tracking

## File Structure
```
src/
  integrations/
    supabase/       # Supabase client + TypeScript types
    api/            # Express API client (wraps fetch to /api/*)
  pages/            # Route components
  components/       # Shared UI components
  hooks/            # Custom React hooks
  utils/            # Helper utilities
  services/         # Local storage service

server/
  index.js          # Express server entry point
  extractVocabulary.js   # Gemini AI vocabulary extraction
  getWordMeaning.js      # Cerebras word meaning lookup
  generateAiQuiz.js      # Cerebras quiz generation
  validateMeaning.js     # Cerebras answer validation
  generateVocabularies.js # Cerebras bulk vocabulary generation
  deleteUser.js          # Supabase admin user deletion

supabase/
  migrations/       # SQL migrations (applied to Supabase project)
  functions/        # Legacy Deno edge functions (replaced by Express routes)
```
