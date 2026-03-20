# 태스크: Phase 9 — LLM 추상화 + Editor 영속화

> 완료: 2026-03-20 16:47

## 작업 내용

LLM 추상화 레이어 도입으로 Agent SDK 전환 준비 + Editor clip order/trim Supabase 영속화

## 변경 사항

- `src/lib/llm.ts` (신규) — `llmChat()` / `llmJSON<T>()`, 현재 Gemini 구현. 전환 시 상단 3줄만 교체
- `src/lib/claude.ts` (신규) — Claude SDK 구현, 전환 대기 상태
- `src/app/api/produce/chat/route.ts` — Gemini 직호출 → `llmChat`
- `src/app/api/write/chat/route.ts` — Gemini 직호출 → `llmChat`
- `src/app/api/write/generate-scenes/route.ts` — Gemini 직호출 3개 → `llmChat` + `llmJSON` x2
- `src/app/api/director/chat/route.ts` — Gemini 직호출 → `llmChat`
- `src/app/api/director/generate-shots/route.ts` — Gemini 직호출 → `llmJSON`
- `src/app/api/editor/reorder/route.ts` — TODO 구현: shots.sort_order Supabase UPDATE
- `src/app/api/editor/trim/route.ts` (신규) — shots.trim_start / trim_end PATCH
- `src/stores/editor-store.ts` — reorderClips/setTrim → fire-and-forget API 호출 + loadData trim 복원
- Supabase migration — shots 테이블에 trim_start, trim_end float 컬럼 추가

## DoD 검증

- [x] 5개 API 라우트 llm.ts 경유 — import 경로 확인
- [x] Editor reorder API shots.sort_order 업데이트 구현
- [x] trim migration 적용 (`{"success":true}`)
- [x] `pnpm build` 통과 (TypeScript 에러 없음)
- [x] git push origin main 완료 (커밋 d2ca8f4)

## 내가 결정한 것

- **trim 컬럼 위치**: `video_clips` 테이블이 아닌 `shots` 테이블 — Kling 미설정으로 video_clips 레코드가 없어 shots가 현재 유일한 실제 데이터
- **Claude SDK 활성화 보류**: `ANTHROPIC_API_KEY` Vercel 미등록 상태. llm.ts는 Gemini 유지
- **fire-and-forget 방식**: reorder/trim 저장 실패 시 UX 블로킹 없이 콘솔만 출력
- **Agent SDK 전환 설계**: tool-use 루프 필요 시 claude.ts에 추가 후 llm.ts 상단만 교체

## 미완료 (Backlog)

- Kling API 키 → Vercel 환경변수 등록
- 전체 파이프라인 E2E 검증 (P1→P5)
