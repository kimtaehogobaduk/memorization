# 암기준섹

영어 단어를 단어장으로 관리하고, 플래시카드와 여러 유형의 퀴즈로 학습하는 React 앱입니다.

## 기술 스택

- React 18 + TypeScript + Vite
- Tailwind CSS + Radix UI
- Supabase Auth, Database, Storage, Edge Functions
- Express API server (AI 기능을 위한 로컬/서버 실행 경로)

## 실행

```bash
npm install
npm run dev       # Express API(:3001)와 Vite(:5000)를 함께 실행
npm run build     # 프론트엔드 프로덕션 빌드
npm run lint
```

환경 변수는 `.env.example`을 복사해 설정합니다. `CEREBRAS_API_KEY`, `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 비밀값이므로 클라이언트에 노출하지 마세요.

## 디렉터리 구조

```text
src/
  components/     공통 UI 및 레이아웃
  hooks/          인증, 토스트, 튜토리얼 등 React hooks
  lib/            재사용 가능한 도메인 로직과 출력 생성기
  pages/          라우트별 화면
  services/       Supabase Edge Function API와 로컬 저장소 연동
  utils/          이미지 업로드, 게스트 데이터 동기화 등 유틸리티
server/
  index.ts        Express 앱과 라우트 등록만 담당
  routes/         기능별 AI·관리자 API 핸들러
  utils/          서버 공통 JSON 복구/재시도 로직
supabase/
  functions/      Supabase Edge Functions
  migrations/     데이터베이스 마이그레이션
```

퀴즈 시험지 생성 로직은 `src/lib/quizTestPaper.ts`로 분리해 화면 컴포넌트가 설정 UI와 라우팅에 집중하도록 했습니다. 사용하지 않는 초기 생성 UI, 중복 Express 핸들러, 중복 이미지 자산은 저장소에서 제거했습니다.
