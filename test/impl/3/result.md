# 시험 결과 / Test Result — impl 3차

- **일자 Date**: 2026-07-11
- **대상 Target**: Papers-SR-Assistant (React 19 + Vite 8, node-react SPA)
- **시험 도구**: Playwright(Chromium) 자동화 + `page.route` API 목킹 + `pnpm build`/`pnpm lint`
- **커밋 Commit**: (git 미사용 프로젝트)

## 요약 / Summary

- **전체 Total: 11, 통과 Pass: 10, 실패 Fail: 0, SKIP: 1**
- **최종 Verdict: PASS** (P0 전건 통과. TC-10은 P2 — 외부 서비스 rate-limit 으로 SKIP, 판정 기준상 허용)

## 케이스 / Cases

| id | 결과 result | 비고 note |
|---|---|---|
| TC-01 | PASS | `pnpm build` 성공(156ms), 신규 린트 오류 0건 |
| TC-02 | PASS | Enter → 드롭다운: 제목·"2022 · NeurIPS · 피인용 3,500회" 메타 표시 |
| TC-03 | PASS | 추가 → 노드 7/7, 자동 선택, 상세 패널 대체 필드("—") 표시 |
| TC-04 | PASS | 참조 title 매칭으로 Transformer 연결 → 선행 연구 필터 2노드 |
| TC-05 | PASS | 연도 가이드라인 2017~2022 로 동적 확장 |
| TC-06 | PASS | 중복 추가 방지: 버튼 "보기" 표시, 총 노드 7 불변 |
| TC-07 | PASS | 500 응답 → "Semantic Scholar API 오류 (HTTP 500)" 표시, 크래시 없음 |
| TC-08 | PASS | 빈 결과 → "검색 결과가 없습니다." |
| TC-09 | PASS | Escape 로 드롭다운 닫힘 |
| TC-10 | **SKIP** | 실 API 스모크: 공용 rate-limit(HTTP 429) 지속으로 SKIP. 단, 프록시 경유 실 API 도달 + 429 시 오류 UI 정상 동작은 확인됨 (curl 재시도 2분 내 미해제) |
| TC-11 | PASS | 외부 논문 큐시트 추가 + MD 내보내기에 FlashAttention STEP 포함 |

## 발견 오류 및 수정 / Bugs & Fixes

| round | 오류 bug | 원인 cause | 수정 fix | 재시험 retest |
|---|---|---|---|---|
| 1 | 논문 추가 직후 그래프 노드 0/7 (TC-03·04·05 FAIL) | 검색어가 입력창에 남아 로컬 필터로 계속 적용 — "flash attention"(공백 포함)이 어떤 논문 제목과도 부분일치하지 않아 전 노드 숨김 | `handleAddExternalPaper` 에서 추가 완료 시 `setSearchQuery("")` 로 검색어 초기화 ([src/App.jsx](../../../src/App.jsx)) | round 2: TC-03/04/05 PASS |
| 1 | 실 API 직접 호출 시 브라우저 CORS 차단 | Semantic Scholar API 의 오류 응답(429 등)에 `Access-Control-Allow-Origin` 헤더 부재 → 브라우저가 CORS 오류로 처리 (curl 로 429 + 헤더 부재 확인) | Vite `server.proxy`/`preview.proxy` 에 `/s2api` → `api.semanticscholar.org` 프록시 추가, API 클라이언트 BASE 를 `/s2api/graph/v1` 로 변경 ([vite.config.js](../../../vite.config.js), [src/api/semanticScholar.js](../../../src/api/semanticScholar.js)) | round 2: 프록시 경유 실 API 429 JSON 정상 수신, CORS 에러 소멸 |

## 첨부 / Logs

- `logs/e2e-run-round2.log` — round 2 실행 로그 (P0/P1 전건 PASS)
- `logs/e2e-results.json` — 케이스별 기계 판독 결과
- `logs/console-errors-round1.log` — round 1 CORS 차단 에러 원본
- `logs/impl3-e2e.mjs` — 시험 자동화 스크립트 (API 목킹 포함)
- `logs/tc02-dropdown.png`, `tc03-added.png`, `tc05-timeline.png`, `tc11-cuesheet.png` — 증적 스크린샷
- `logs/export-impl3.md` — 외부 논문 포함 MD 내보내기 산출물
