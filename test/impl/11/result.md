# 시험 결과 / Test Result — impl 11차

- **일자 Date**: 2026-07-11
- **대상 Target**: Papers-SR-Assistant (React 19 + Vite 8) + 협업 서버 (Node 22 + ws 8.21.0, :8787)
- **시험 도구**: Playwright(Chromium) **2-페이지 실시간 동기화** 자동화 + S2 목킹 + `pnpm build`/`pnpm lint`
- **커밋 Commit**: (git 미사용 프로젝트)

## 요약 / Summary

- **전체 Total: 11, 통과 Pass: 11, 실패 Fail: 0**
- **최종 Verdict: PASS** (round 1 무결함 — 실 WebSocket 서버 대상 양방향 동기화 검증, 페이지 에러 0건)

## 케이스 / Cases

| id | 결과 result | 비고 note |
|---|---|---|
| TC-01 | PASS | `pnpm add ws@8.21.0` 후 빌드 성공(208ms). round 0 에서 collab.js 린트 경고 4건(`x && x()` 패턴) 즉시 수정 → 신규 린트 0건 |
| TC-02 | PASS | `GET :8787/health` → `{ok:true, sessions:0}` |
| TC-03 | PASS | 세션 시작 → 배지 "협업 중 · 1명", 참여 링크(`#collab=`) 클립보드 복사 |
| TC-04 | PASS | B 링크 참여(confirm) → 양쪽 "2명", A 의 사전 메모가 B 에 시드됨 (첫 참여자 상태 시드) |
| TC-05 | PASS | A 메모 추가 → 1초 내 B 반영 (A→B) |
| TC-06 | PASS | B 큐시트 삭제 → A 4→3 항목 (B→A 역방향) |
| TC-07 | PASS | A 외부 논문 추가 → B 그래프 6→7 노드 (외부 논문 + 스냅샷 동기화) |
| TC-08 | PASS | B 이탈 → A 배지 "1명" 갱신 |
| TC-09 | PASS | 토글 재클릭 → 세션 종료, 배지 "협업" 복귀 |
| TC-10 | PASS | 서버 종료 후 시작 시도 → "협업 연결 실패" 배지, 앱 크래시 없음 |
| TC-11 | PASS | 협업 종료 후 공유 버튼·추천 섹션 회귀 정상 |

## 발견 오류 및 수정 / Bugs & Fixes

| round | 오류 bug | 원인 cause | 수정 fix | 재시험 retest |
|---|---|---|---|---|
| 0 (사전) | collab.js 린트 경고 4건 | `onInit && onInit()` 표현식 패턴 (no-unused-expressions) | if 문으로 교체 | 린트 클린 |
| 0 (사전) | 협업 서버 기동 실패 (EADDRINUSE :8787) | 사전 스모크 테스트 서버 프로세스가 비대화형 셸의 `kill %1` 로 종료되지 않고 포트 점유 | 잔존 프로세스 kill 후 재기동 (환경 이슈, 소스 무결) | 헬스 정상 |
| 1 | 없음 | — | — | round 1 전건 PASS |

## 첨부 / Logs

- `logs/e2e-run-round1.log` — round 1 실행 로그 (전건 PASS)
- `logs/e2e-results.json` — 케이스별 기계 판독 결과
- `logs/impl11-e2e.mjs` — 시험 자동화 스크립트 (2-페이지 동기화·서버 다운 주입)
- `logs/tc03-session-start.png`, `tc04-joined.png`, `tc07-external-sync.png` — 증적 스크린샷
