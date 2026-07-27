# 시험 결과 / Test Result — impl 8차

- **일자 Date**: 2026-07-11
- **대상 Target**: Papers-SR-Assistant (React 19 + Vite 8, node-react SPA)
- **시험 도구**: Playwright(Chromium) 자동화 (clipboard 권한, confirm 다이얼로그 처리) + S2 목킹 + `pnpm build`/`pnpm lint`
- **커밋 Commit**: (git 미사용 프로젝트)

## 요약 / Summary

- **전체 Total: 8, 통과 Pass: 8, 실패 Fail: 0**
- **최종 Verdict: PASS** (round 2에서 전건 통과, 콘솔 에러 0건)

## 케이스 / Cases

| id | 결과 result | 비고 note |
|---|---|---|
| TC-01 | PASS | `pnpm build` 성공(153ms), 신규 린트 오류 0건 |
| TC-02 | PASS | "공유" 클릭 → 클립보드에 `#share=` URL(949자, 외부 논문 포함) + "복사됨" 피드백 |
| TC-03 | PASS | 클린 상태에서 공유 URL 접속 + confirm 수락 → 노드 7·수동 정렬·메모·큐시트 5항목 복원, 해시 제거 |
| TC-04 | PASS | 외부 논문 인용 엣지 라운드트립 유지 (선행 연구 필터 2노드) |
| TC-05 | PASS | confirm 거부 → 기본 6노드 유지, 해시 제거 |
| TC-06 | PASS | 손상 해시(`#share=broken!!`) → confirm 미발생, 정상 로드, 페이지 에러 0건 |
| TC-07 | PASS | 가져온 워크스페이스 재공유 → payload 전 필드 원본 동일 (무손실 라운드트립) |
| TC-08 | PASS | 가져오기 후 추천 섹션·MD 내보내기(읽기 근거 + 공유 메모 포함) 정상 |

## 발견 오류 및 수정 / Bugs & Fixes

| round | 오류 bug | 원인 cause | 수정 fix | 재시험 retest |
|---|---|---|---|---|
| 1 | 앱이 이미 열린 탭에서 공유 URL 진입 시 가져오기 미동작 (TC-03·05·06 FAIL) | 해시만 다른 URL 내비게이션은 same-document 처리되어 페이지가 리로드되지 않음 → 마운트 전용 가져오기 효과가 실행되지 않음 (실사용 UX 결함: 열린 탭에 링크 붙여넣기 무반응) | 가져오기 로직을 `hashchange` 리스너로도 구동하도록 확장 ([src/App.jsx](../../../src/App.jsx)) — 마운트(신규 탭) + hashchange(기존 탭) 양쪽 커버. 시험도 클린 기준선 확보용 명시적 reload 삽입 | round 2: 7/7 PASS |

## 첨부 / Logs

- `logs/e2e-run-round2.log` — round 2 실행 로그 (전건 PASS)
- `logs/e2e-results.json` — 케이스별 기계 판독 결과
- `logs/impl8-e2e.mjs` — 시험 자동화 스크립트 (클립보드 판독·payload 디코딩 검증 포함)
- `logs/tc02-share-copied.png`, `tc03-imported.png` — 증적 스크린샷
- `logs/export-impl8.md` — 가져온 워크스페이스 MD 내보내기 산출물
