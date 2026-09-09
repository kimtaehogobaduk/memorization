# 암기준섹 - Vocabulary Learning App

한국어 사용자를 위한 영어 단어 학습 앱입니다. 단어장 관리, 게스트 localStorage 저장, 여러 퀴즈 모드, 그룹 학습, AI 단어 기능을 제공합니다.

## Architecture

- **Frontend**: React 18, Vite, TypeScript, React Router, Tailwind CSS, Radix UI
- **Data/Auth**: Supabase Auth, PostgreSQL, Storage, Realtime
- **Edge API**: `supabase/functions/`의 인증 및 AI Edge Functions
- **Local API**: `server/index.ts`는 Express 앱의 진입점이며 기능별 핸들러는 `server/routes/`에 있습니다.
- **Frontend API client**: `src/services/api.ts`에서 Supabase Edge Functions를 호출합니다.

## Running

```bash
npm install
npm run dev       # Express(:3001) + Vite(:5000)
npm run server    # Express API only
npm run frontend  # Vite only
npm run build
npm run lint
```

Vite는 `0.0.0.0:5000`에 바인딩되고, `/api` 요청은 로컬 Express 서버 `3001`로 프록시됩니다.

## Environment variables

`.env.example`을 기준으로 설정합니다.

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/public key
- `VITE_SUPABASE_PROJECT_ID` — Supabase project ID
- `CEREBRAS_API_KEY` — Express AI routes용 서버 비밀키
- `GEMINI_API_KEY` — 파일 단어 추출용 서버 비밀키
- `SUPABASE_SERVICE_ROLE_KEY` — 관리자용 서버 비밀키
- `SERVER_PORT` — Express 포트(기본값 `3001`)

## Source layout

- `src/pages/` — 라우트별 화면
- `src/components/` — 공통 컴포넌트와 사용 중인 UI primitives
- `src/hooks/` — 인증, 토스트, 튜토리얼, 사운드 hooks
- `src/lib/` — 시험지 HTML 생성 등 도메인 로직
- `src/services/` — Supabase Edge Function 및 localStorage 서비스
- `src/integrations/supabase/` — Supabase client와 데이터베이스 타입
- `server/routes/` — Express API 기능별 모듈
- `supabase/functions/` — Supabase Edge Functions
- `supabase/migrations/` — 데이터베이스 마이그레이션
