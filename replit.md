# 암기준섹 (Vocabulary Study App)

A Korean vocabulary learning app built with React, Vite, and Supabase. Supports vocabulary management, quiz modes, group study, and AI-powered features.

## Architecture

This is a **pure frontend** React/Vite/TypeScript application. There is no custom Node.js server — all backend functionality is handled by Supabase (Auth, Database, Edge Functions).

### Stack
- **Frontend**: React 18, Vite 5, TypeScript
- **UI**: Tailwind CSS, shadcn/ui (Radix UI primitives), Framer Motion
- **Routing**: React Router v6
- **State**: TanStack React Query
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **AI Features**: Cerebras (quiz generation, word meanings, validation), Gemini (vocabulary extraction), PDF.co (PDF text extraction)

### Supabase Edge Functions
All AI-related logic runs in Supabase Edge Functions (Deno):
- `get-word-meaning` — Get Korean meaning of English words via Cerebras
- `generate-ai-quiz` — Generate quiz questions via Cerebras
- `validate-meaning` — Validate user answers via Cerebras
- `extract-vocabulary` — Extract vocabulary from uploaded PDFs via PDF.co + Gemini
- `generate-vocabularies` — Bulk generate vocabulary lists via Cerebras
- `delete-user` — Admin: delete a user account

### Key Source Directories
- `src/pages/` — All route pages
- `src/components/` — Reusable components
- `src/hooks/` — Custom React hooks (auth, toast, mobile, tutorial, quiz sound)
- `src/integrations/supabase/` — Supabase client + auto-generated database types
- `src/services/` — Local storage service (for offline/guest mode)
- `src/utils/` — Utility helpers (sync, image upload, local vocab)
- `supabase/migrations/` — All Supabase database migrations
- `supabase/functions/` — Supabase Edge Functions (Deno)

## Environment Variables
Stored as Replit environment variables (shared):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/public key
- `VITE_SUPABASE_PROJECT_ID` — Supabase project ID

## Running the App
```bash
npm run dev      # Development server on port 5000
npm run build    # Production build to dist/
npm run preview  # Preview production build
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
