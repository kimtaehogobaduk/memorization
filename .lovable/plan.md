# Firebase 데이터 이전 + AI는 Lovable AI 유지

## 목표
- **AI**: 모든 AI 기능을 Lovable AI(Gemini/GPT 게이트웨이)로 전환 — 별도 API 키 불필요
- **데이터**: 인증/DB/스토리지를 Firebase(`memorization-d5785`)로 이전

## 먼저 알아두실 점
- 기존 사용자의 **비밀번호는 이전이 불가능**합니다. 계정(이메일)과 데이터는 옮길 수 있지만, 사용자들은 최초 1회 비밀번호 재설정이 필요합니다.
- 데이터 실제 이전(현재 DB → Firestore)에는 Firebase **서비스 계정 JSON 키**가 필요합니다.
- 현재 앱의 36개 파일이 기존 백엔드를 직접 호출합니다. 전면 재작업이라 단계별로 진행합니다.

## 1단계 — AI를 Lovable AI로
대상 함수: get-word-meaning, validate-meaning, grade-sentence, generate-ai-quiz, generate-vocabularies, extract-vocabulary
- Groq/Cerebras 호출을 Lovable AI 게이트웨이(`google/gemini-2.5-flash`, 폴백 `google/gemini-2.5-flash-lite`)로 교체
- 이미지/PDF 단어 추출도 Gemini 멀티모달로 통일
- 429/402 에러 처리 및 JSON 스키마 강제 유지

## 2단계 — Firebase 연결 계층
- `firebase` 패키지 추가, `src/integrations/firebase/client.ts`에 제공해주신 설정으로 초기화(Auth, Firestore, Storage, Analytics)
- 기존 `supabase.from(...)` 사용부를 대체할 `src/integrations/firebase/db.ts` 헬퍼 작성(컬렉션별 CRUD, 쿼리, 실시간 구독)

## 3단계 — 데이터 모델 이전
컬렉션: `profiles`, `vocabularies`, `words`, `chapters`, `bookshelves`, `groups`, `group_members`, `group_messages`, `user_settings`, `user_roles`, `otp_codes`
- Firestore 보안 규칙 작성: 본인 데이터만 읽기/쓰기, 공개 단어장은 읽기 허용, 역할은 `user_roles` 문서 기반 검증
- Storage 규칙: `avatars/`, `group-images/`, `word-images/` — 본인 경로만 쓰기, 읽기 공개

## 4단계 — 화면 전환
36개 파일을 순서대로 교체: 인증(Auth, useAuth) → 단어장/단어 → 그룹/채팅 → 퀴즈/통계 → 관리자
- 게스트 localStorage 로직과 로그인 시 동기화는 그대로 유지, 저장 대상만 Firestore로 변경

## 5단계 — 기존 데이터 이관
- 서비스 계정 키를 주시면 현재 DB 전체를 읽어 Firestore에 1:1 적재하는 일회성 스크립트 실행
- 계정은 이메일 기준으로 Firebase Auth에 생성, 사용자에게 비밀번호 재설정 안내

## 필요한 것
1. Firebase **서비스 계정 JSON**(데이터 이관용)
2. Firebase 콘솔에서 **이메일/비밀번호 로그인 활성화**(및 Google 로그인 사용 시 함께 활성화)

## 진행 방식 제안
1단계(AI)부터 바로 진행하고, 이후 2~4단계를 순차적으로 작업합니다. 5단계는 서비스 계정 키를 받은 뒤 실행합니다.
