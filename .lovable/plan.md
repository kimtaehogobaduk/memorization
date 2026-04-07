

## Replit 작업 이어하기 - 남은 작업 계획

Replit이 진행하던 6가지 작업의 현재 상태를 분석했습니다.

### 완료된 작업
1. **Settings - 스마트 반복 복습 토글** - 이미 구현됨 (line 659-671)
2. **Study - 스마트 반복 복습 정렬** - 이미 구현됨 (line 99-124, study_progress 기반 정렬)

### 남은 작업

#### 1. QuizMultipleChoice/QuizWriting/QuizRandom - 스마트 반복 복습 정렬 적용
현재 3개 퀴즈 페이지에는 smart_review 정렬이 없음. Study.tsx와 동일한 로직(study_progress 테이블에서 incorrect/correct 비율로 정렬)을 추가.

- `src/pages/QuizMultipleChoice.tsx` - loadWords()에서 Supabase 단어 로드 후 smart_review 설정 확인 → study_progress 조회 → 오답률 높은 단어 우선 정렬
- `src/pages/QuizWriting.tsx` - 동일 로직 적용
- `src/pages/QuizRandom.tsx` - 동일 로직 적용

#### 2. VocabularyDetail - 챕터 관리 + 단어 추가/수정/삭제 + 즐겨찾기 즉시 반영
현재 VocabularyDetail은 읽기 전용. 다음을 추가:

- **챕터 필터 탭**: chapters 배열이 있을 때 상단에 챕터 선택 버튼들 표시
- **즐겨찾기 토글 즉시 반영**: 현재 toggleFavorite 호출 후 항상 "저장했습니다" 토스트만 표시 → isFavorite 상태를 관리하여 별 아이콘 색상 즉시 변경 (노란색 ↔ 회색)
- **단어 추가/수정/삭제**: isOwner일 때 단어 카드에 수정/삭제 버튼, 하단에 단어 추가 FAB

#### 3. Statistics - 즐겨찾기 기반 복습 페이지 개선
현재 단순 즐겨찾기 목록만 표시. 개선 사항:

- 즐겨찾기 단어로 빠른 퀴즈 시작 버튼 추가
- TTS 발음 재생 버튼 추가
- 단어 카드 클릭 시 뜻 토글 (플래시카드 효과)

#### 4. OCR 프롬프트 품질 보정 강화
현재 extract-vocabulary edge function의 프롬프트가 기본적. 개선:

- 프롬프트에 "OCR 오류 보정" 지시 추가 (예: 흔한 OCR 오류 패턴 자동 수정)
- 한국어 뜻이 없는 경우 AI가 자동 생성하도록 명시
- 챕터 구분 패턴을 더 다양하게 인식 (Lesson, Week, Part 등)

### 구현 순서
1. 퀴즈 3개 파일에 스마트 반복 복습 정렬 추가 (병렬)
2. VocabularyDetail 즐겨찾기 즉시 반영 + 챕터 필터
3. Statistics 복습 기능 강화
4. OCR 프롬프트 개선 + edge function 재배포

### 기술 세부사항
- 스마트 복습 정렬: `getLocalSettings().smart_review` 확인 → `supabase.from("study_progress").select(...)` → `incorrect_count / (correct_count + 1)` 내림차순 정렬
- 즐겨찾기 상태: `studyNotes.isFavorite(word.id)`를 각 단어에 체크하여 `favoriteIds` Set으로 관리
- VocabularyDetail 단어 CRUD: 로컬 단어장은 `localStorageService`, Supabase 단어장은 `supabase.from("words")` 사용

