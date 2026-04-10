# 암기준섹 - Vocabulary Learning App

A Korean vocabulary learning application built with React + Vite + TypeScript, featuring AI-powered vocabulary extraction, quiz generation, and word meaning lookup.

## Architecture

### Frontend
- **React 18** + **TypeScript** with **Vite 5**
- **Tailwind CSS** + **shadcn/ui** (Radix UI) for styling
- **React Router v6** for routing
- **TanStack Query** for server state management
- **Supabase JS** for auth, database, and storage

### Backend
- **Express.js** server (`server/index.js`) running on port 3001
- Handles all AI API calls (Gemini, Cerebras) — keeps API keys server-side
- Proxied from Vite dev server via `/api/*`

### Database & Auth
- **Supabase** for PostgreSQL database, authentication, and file storage
- Supabase RLS (Row Level Security) policies handle data access control

## Running the App

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
