# 시험 결과 / Test Result — impl 5차

- **일자 Date**: 2026-07-11
- **대상 Target**: Papers-SR-Assistant (React 19 + Vite 8, node-react SPA)
- **시험 도구**: Playwright(Chromium) 자동화 + `page.route` API 목킹 + `pnpm build`/`pnpm lint`
- **커밋 Commit**: (git 미사용 프로젝트)

## 요약 / Summary

- **전체 Total: 10, 통과 Pass: 10, 실패 Fail: 0**
- **최종 Verdict: PASS** (재시험 round 2에서 전건 통과, 콘솔 에러 0건)

## 케이스 / Cases

| id | 결과 result | 비고 note |
|---|---|---|
| TC-01 | PASS | `pnpm build` 성공(154ms), 신규 린트 오류 0건 |
| TC-02 | PASS | 2015년 논문 추가 시 피인용 목킹(Swin) title 매칭 → Swin→새 논문 엣지 생성, 후속 연구 필터 2/7 |
| TC-03 | PASS | 새로고침 후 노드 7·수동 정렬 모드·메모 칩·큐시트 5항목 전부 복원 |
| TC-04 | PASS | 목 논문(Swin)에 가해진 엣지 패치도 새로고침 후 유지 (refPatches 영속) |
| TC-05 | PASS | 동일 검색어 2회 → 네트워크 요청 1회 (캐시 적중), 2회째도 결과 정상 표시 |
| TC-06 | PASS | 다른 검색어 → 새 요청 발생 (URL 단위 캐시 키 분리) |
| TC-07 | PASS | 초기화 confirm 취소 → 상태 불변 (노드 7 유지) |
| TC-08 | PASS | 초기화 confirm 수락 → 기본 6노드, 메모 소멸, 외부 논문·`psra:cache:*` 키 전부 삭제 |
| TC-09 | PASS | 손상 JSON 주입 후 새로고침 → 페이지 에러 0건, 기본 상태(6노드) 정상 로드 |
| TC-10 | PASS | 초기화 후 MD 내보내기: STEP 4개 + 읽기 근거 4라인 정상 |

## 발견 오류 및 수정 / Bugs & Fixes

| round | 오류 bug | 원인 cause | 수정 fix | 재시험 retest |
|---|---|---|---|---|
| 1 | 새로고침 시 메모만 복원 실패 (TC-03 FAIL — sort·노드·큐시트는 정상 복원) | `memos` useState 초기값이 persisted 상태를 읽지 않고 `{}` 고정 → 마운트 직후 persist 효과가 빈 메모로 저장분을 덮어씀 (localStorage 프로브로 저장→소실 과정 확인) | `useState(persisted?.memos ?? {})` 로 복원 경로 연결 ([src/App.jsx](../../../src/App.jsx)) | round 2: 9/9 PASS |

## 첨부 / Logs

- `logs/e2e-run-round2.log` — round 2 실행 로그 (전건 PASS)
- `logs/e2e-results.json` — 케이스별 기계 판독 결과
- `logs/impl5-e2e.mjs` — 시험 자동화 스크립트 (S2 검색·참조·피인용 목킹, confirm 다이얼로그 처리 포함)
- `logs/tc02-bidirectional.png`, `tc03-restored.png`, `tc08-reset.png` — 증적 스크린샷
- `logs/export-impl5.md` — 초기화 후 MD 내보내기 산출물
