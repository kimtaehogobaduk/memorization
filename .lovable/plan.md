원인 분석 결과, `grade-sentence` 백엔드 함수가 Cerebras에 존재하지 않거나 권한이 없는 모델 ID `llama-3.3-70b`를 호출하고 있습니다. 실제 함수 로그에도 `Model llama-3.3-70b does not exist or you do not have access to it` 404가 반복 기록되어 있고, 프로젝트의 다른 Cerebras 기능들은 정상 모델 ID인 `llama3.1-8b`를 사용하고 있습니다. 그래서 AI가 채점에 실패하고, 현재 코드는 실패를 숨긴 채 `AI 채점 실패. 정답 처리합니다.`로 fallback 처리하고 있습니다.

구현 계획:

1. `supabase/functions/grade-sentence/index.ts` 수정
   - 모델 ID를 현재 프로젝트에서 쓰는 Cerebras 지원 모델 `llama3.1-8b`로 변경합니다.
   - 404/429/5xx 같은 Cerebras 오류를 더 명확히 처리하고, 일시적 오류는 재시도하도록 보강합니다.
   - JSON 파싱 실패 시에도 응답 원문에서 JSON을 복구하는 로직을 유지/강화합니다.
   - AI 호출 실패를 무조건 정답 처리하는 fallback은 제거하거나 최소화해서, 실제 채점 결과가 아닌 경우 사용자가 오해하지 않게 합니다.

2. `server/gradeSentence.js`와 필요 시 `server/index.ts`의 동일한 구형 모델 설정도 함께 정리
   - 현재 앱은 Cloud 함수(`supabase.functions.invoke`)를 쓰지만, 남아 있는 서버 코드에도 같은 잘못된 모델 ID가 있어 이후 혼선을 막기 위해 동일하게 수정합니다.

3. 검증
   - 수정 후 `grade-sentence` 함수를 직접 호출 테스트해서 `AI 채점 실패` fallback이 아니라 실제 `{ correct, reason }` 형태의 채점 결과가 돌아오는지 확인합니다.
   - 예시로 `aim / What's your aim?` 같은 정상 문장과, 단어를 쓰지 않은 문장 하나를 테스트해 성공/오답 모두 확인합니다.

기대 결과:
- 사용자가 제출하면 더 이상 반복적으로 `AI 채점 실패. 정답 처리합니다.`가 뜨지 않고, 실제 AI 채점 이유가 표시됩니다.
- 단어 뜻은 기존처럼 퀴즈 화면에 노출하지 않습니다.