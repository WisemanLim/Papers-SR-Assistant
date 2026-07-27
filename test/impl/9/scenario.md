# 기능 구현 9차(impl/9) 테스트 시나리오

## 1. 개요
본 시나리오는 Papers-SR-Assistant 9차 구현분의 정상 작동 여부를 검증한다.
9차 구현 범위 (PRD Phase 2 + 2026-07-11 변경 이력):
- **LLM 하이브리드 프로바이더** (`src/api/llm.js`): Gemini API 키(env `VITE_GEMINI_API_KEY` 또는
  localStorage `psra:geminiKey`) 설정 시 Gemini(gemini-2.0-flash), 미설정 시 **로컬 Ollama 자동 폴백**
  (`/ollama` Vite 프록시, 모델 자동 선택), 둘 다 불가 시 규칙 기반 시뮬레이터 유지.
- **AI 챗 실연동**: 논문 컨텍스트(제목·요약·기여·한계·수식)를 시스템 프롬프트로 주입(환각 방지 §5-3),
  응답 엔진 배지 표시, 생성 중 로딩 버블·입력 비활성, LLM 오류 시 시뮬레이터 응답으로 자동 대체.
- **[FR-4.2] 외부 논문 AI 한글 요약 생성**: 상세 패널 버튼 → LLM 요약 → tldr 갱신(영속).

## 2. 사전 조건
- `pnpm build` / `pnpm lint` 통과 (회귀 없음).
- `pnpm dev` 기동, 시작 시 localStorage `psra:*` 초기화.
- Playwright(Chromium) 자동화 — 프로바이더별 응답은 `page.route` 목킹 (모드 전환 시 reload 로 감지 캐시 초기화).
  실 Ollama 스모크(TC-08)는 로컬 Ollama(mistral) 대상, 미기동/타임아웃 시 SKIP 허용.
- 원본 로그는 `logs/` 저장.

## 3. 케이스 표

| id | 목적 purpose | 입력 input | 기대결과 expected | 우선순위 |
|---|---|---|---|---|
| TC-01 | 빌드/린트 회귀 | `pnpm build`, `pnpm lint` | 빌드 성공, 신규 린트 오류 0건 | P0 |
| TC-02 | Ollama 프로바이더 감지 | 키 없음 + `/ollama/api/tags` 목킹 | 챗 탭 배지 "Ollama (test-model)" | P0 |
| TC-03 | 챗 실연동 + 컨텍스트 주입 | 질문 전송 (`/ollama/api/chat` 목킹) | 목킹 응답 렌더, 요청 system 프롬프트에 논문 제목 포함 | P0 |
| TC-04 | LLM 오류 폴백 | chat 500 목킹 | "LLM 호출 실패" 안내 + 시뮬레이터 응답 병기, 크래시 없음 | P0 |
| TC-05 | 시뮬레이터 폴백 | tags 요청 차단 후 reload | 배지 "규칙 기반 시뮬레이터" + 기존 규칙 응답 동작 | P0 |
| TC-06 | Gemini 우선순위 | localStorage `psra:geminiKey` + googleapis 목킹 | 배지 "Gemini (...)", Gemini 목킹 응답 렌더 | P0 |
| TC-07 | 외부 논문 한글 요약 | 외부 논문 추가 → "AI 한글 요약 생성" 클릭 | tldr 가 LLM 요약으로 갱신, 새로고침 후 유지. 목 논문에는 버튼 미노출 | P0 |
| TC-08 | 실 Ollama 스모크 | 목킹 해제, 실 로컬 mistral 질의 | 실제 응답 수신 (미기동/타임아웃 시 SKIP 기록) | P2 |
| TC-09 | 회귀 | 추천 섹션·큐시트 렌더 | 정상 (LLM 변경 무영향) | P1 |

## 4. 판정 기준
- P0 전건 PASS 필수. P1 실패 시 수정·재시험. P2(TC-08)는 로컬 LLM 가용성 의존 — 실패 시 사유 기록 후 SKIP 가능.
