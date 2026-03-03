# Tale Studio

B2B AI 영상 제작 도구. 텍스트 → 전문 촬영 기법 적용 고품질 AI 비디오 자동 생성.

## 기술 스택

- **Frontend**: Next.js 16 (App Router) + Tailwind v4 + shadcn/ui + Zustand
- **3D**: Three.js + React Three Fiber (P4 카메라 프리뷰)
- **Backend**: Next.js API Routes
- **DB**: Supabase (PostgreSQL)
- **배포**: Vercel

## 프로젝트 구조

```
tale/
├── specs/                      # 제품 스펙 (SoT)
│   ├── mvp_scope.md            # Scope SoT: MVP 범위 + 기술 스택 + 구현 순서
│   ├── ux_pages.md             # UX SoT: 페이지별 레이아웃, 요소, 인터랙션
│   ├── api_features.md         # API 기능 스펙 (6축 카메라, Knowledge DB 등)
│   ├── decisions.md            # 의사결정 로그
│   ├── open_questions.md       # 열린/닫힌 질문 추적
│   └── layers/                 # 파이프라인 레이어별 입출력 계약
│       ├── L1_scene_architect.md
│       ├── L2_shot_composer.md
│       └── L3_prompt_builder.md
│
├── src/                        # Next.js 앱
│   ├── app/studio/             # 5-Stage: Producer / Writer / Artist / Director / Editor
│   ├── components/             # UI 컴포넌트 (layout + shadcn/ui)
│   ├── stores/                 # Zustand (project, artist, director)
│   ├── mocks/                  # Mock 데이터 (4씬, 24샷, 3캐릭터)
│   ├── types/                  # 공유 타입 (L1~L3 기반)
│   └── lib/                    # 유틸 + Supabase 클라이언트
│
├── databases/
│   ├── knowledge/              # 촬영 기법 Knowledge DB (YAML)
│   └── migrations/             # Supabase 스키마
│
└── assets/lore/                # 로어/시나리오 데이터
```

## 핵심 파이프라인

```
[Story] → [Pumpup] → [L1 Scene Architect] → [L2 Shot Composer] → [L3 Prompt Builder] → [Video API]
```

## 스펙 읽는 순서

1. `specs/mvp_scope.md` — MVP 범위 + 기술 결정
2. `specs/ux_pages.md` — UX 페이지별 상세
3. `specs/api_features.md` — API 기능 스펙
4. `specs/layers/L1~L3` — 레이어별 입출력 계약
5. `specs/decisions.md` — 왜 이렇게 결정했는지

## Quick Start (새 머신 셋업)

### 사전 요구

- **Node.js** ≥ 20 (`node -v`)
- **pnpm** ≥ 9 (`npm i -g pnpm` 또는 `corepack enable`)
- **Git**
- **Claude Code** (`npm i -g @anthropic-ai/claude-code`)

### 1. 클론 & 설치

```bash
git clone https://github.com/<org>/tale.git
cd tale
pnpm install
```

### 2. 환경변수

```bash
cp .env.example .env
```

`.env` 파일을 열고 아래 키를 채워 넣기:

| 키 | 용도 | 필수 |
|----|------|------|
| `OPENAI_API_KEY` | GPT-4o, DALL-E 3 | MVP 시 |
| `GOOGLE_API_KEYS` | Veo (영상 생성) | MVP 시 |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | Knowledge DB | MVP 시 |

> 로컬 개발(Mock 모드)에서는 API 키 없이도 UI 확인 가능

### 3. 실행

```bash
pnpm dev          # http://localhost:3000
pnpm build        # 프로덕션 빌드
pnpm lint         # ESLint
```

### 4. Claude Code로 개발 시작

```bash
cd tale
claude

# 추천 첫 프롬프트:
# "CLAUDE.md 읽고 현재 프로젝트 상태 파악해줘"
# "specs/mvp_scope.md 기준으로 다음 구현할 것 알려줘"
```

**병렬 개발 규칙** — `CLAUDE.md`의 "병렬 개발 규칙" 섹션 참고:
- Dev A: `feature/producer-writer-artist` 브랜치 (P1, P2, P3)
- Dev B: `feature/director-editor` 브랜치 (P4, P5)
- 공유 영역(`types/`, `components/layout/`, `stores/project-store.ts`) 변경 → main PR
